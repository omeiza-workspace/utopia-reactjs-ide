import React from 'react'
import { GithubOperations } from '../../core/shared/github/operations'
import { forceNotNull } from '../../core/shared/optional-utils'
import { NO_OP } from '../../core/shared/utils'
import { totallyEmptyDefaultProject } from '../../sample-projects/sample-project-utils'
import invariant from '../../third-party/remix/invariant'
import { useOnClickAuthenticateWithGithub } from '../../utils/github-auth-hooks'
import { Dialog, FormButton } from '../../uuiui'
import { isLoggedIn, type EditorDispatch } from '../editor/action-types'
import { setGithubState, showToast, updateGithubData } from '../editor/actions/action-creators'
import { useDispatch } from '../editor/store/dispatch-context'
import type { GithubUser } from '../editor/store/editor-state'
import { type EditorStorePatched, type GithubRepoWithBranch } from '../editor/store/editor-state'
import { Substores, useEditorState, useRefEditorState } from '../editor/store/store-hook'
import { onClickSignIn } from '../titlebar/title-bar'
import { CloneParamKey } from '../editor/persistence/persistence-backend'
import { getPublicRepositoryEntryOrNull } from '../../core/shared/github/operations/load-repositories'
import { OperationContext } from '../../core/shared/github/operations/github-operation-context'
import { notice } from '../common/notice'

export const LoadActionsDispatched = 'loadActionDispatched'

export const GithubRepositoryCloneFlow = React.memo(() => {
  const githubRepo = useEditorState(
    Substores.userState,
    (store) => store.userState.githubState.gitRepoToLoad,
    'GithubRepositoryCloneFlow gitRepoToLoad',
  )
  const userLoggedIn = useEditorState(
    Substores.userState,
    (store) => isLoggedIn(store.userState.loginState),
    'GithubRepositoryCloneFlow userLoggedIn',
  )

  const githubAuthenticated = useEditorState(
    Substores.userState,
    (store) => store.userState.githubState.authenticated,
    'GithubRepositoryCloneFlow githubAuthenticated',
  )
  const githubUserDetails = useEditorState(
    Substores.github,
    (store) => store.editor.githubData.githubUserDetails,
    'GithubRepositoryCloneFlow githubUserDetails',
  )

  const onClickAuthenticateWithGithub = useOnClickAuthenticateWithGithub()

  if (githubRepo == null) {
    // we don't want to load anything, so just return null to hide this overlay
    return null
  }
  if (!userLoggedIn) {
    // we want to prompt the user to log in
    return (
      <Dialog
        title='Not Signed In'
        content={<>You need to be signed in to be able to clone a repository from GitHub</>}
        closeCallback={NO_OP}
        defaultButton={
          <FormButton primary onClick={onClickSignIn}>
            Sign In To Utopia
          </FormButton>
        }
      />
    )
  }
  if (!githubAuthenticated) {
    // we want to prompt the user to log authenticate their github
    return (
      <Dialog
        title='Connect to Github'
        content={
          <>
            You need to connect Utopia with your Github account to be able to access Github
            repositories
          </>
        }
        closeCallback={NO_OP}
        defaultButton={
          <FormButton primary onClick={onClickAuthenticateWithGithub}>
            Authenticate with Github
          </FormButton>
        }
      />
    )
  }

  // The GitClonePseudoElement triggers the actual repo cloning
  return <GitClonePseudoElement githubRepo={githubRepo} userDetails={githubUserDetails} />
})

// The git repo clone flow is initiated from the URL, which means we only ever want to do it once per editor load
let didWeInitiateGitRepoDownloadSinceTheEditorLoaded = false

async function cloneGithubRepo(
  dispatch: EditorDispatch,
  storeRef: { current: EditorStorePatched },
  githubRepo: GithubRepoWithBranch,
) {
  if (didWeInitiateGitRepoDownloadSinceTheEditorLoaded) {
    return
  }
  didWeInitiateGitRepoDownloadSinceTheEditorLoaded = true
  const projectName = `${githubRepo.owner}-${githubRepo.repository}`

  // Obtain a projectID from the server, and save an empty initial project
  storeRef.current.persistence.createNew(projectName, totallyEmptyDefaultProject())
  const loadActionDispatchedByPersistenceMachine =
    await awaitLoadActionDispatchedByPersistenceMachine()
  const createdProjectID = loadActionDispatchedByPersistenceMachine.projectId

  const repositoryEntry = await getPublicRepositoryEntryOrNull(OperationContext, {
    owner: githubRepo.owner,
    repo: githubRepo.repository,
  })
  if (repositoryEntry == null) {
    dispatch([showToast(notice('Cannot find repository', 'ERROR'))])
    return
  }
  const githubBranch = githubRepo.branch ?? repositoryEntry.defaultBranch

  await GithubOperations.updateProjectWithBranchContent(
    storeRef.current.workers,
    dispatch,
    forceNotNull('Should have a project ID by now.', createdProjectID),
    githubRepo,
    githubBranch,
    false,
    [],
    storeRef.current.builtInDependencies,
    {}, // Assuming a totally empty project (that is being saved probably parallel to this operation, hopefully not causing any race conditions)
    'user-initiated',
  )

  // at this point we can assume the repo is loaded and we can finally hide the overlay
  dispatch([
    setGithubState({ gitRepoToLoad: null }),
    updateGithubData({ publicRepositories: [repositoryEntry] }),
  ])
}

type GitClonePseudeElementProps = {
  githubRepo: GithubRepoWithBranch
  userDetails: GithubUser | null
}

const GitClonePseudoElement = React.memo((props: GitClonePseudeElementProps) => {
  const { githubRepo, userDetails } = props
  const dispatch = useDispatch()

  const editorStoreRef = useRefEditorState((store) => store)

  const [cloned, setCloned] = React.useState(false)

  React.useEffect(() => {
    if (userDetails != null && !cloned) {
      void cloneGithubRepo(dispatch, editorStoreRef, githubRepo)
      setCloned(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDetails, cloned])

  // The GitClonePseudoElement's sole job is to call cloneGithubRepo in a useEffect.
  // I pulled it to a dedicated component so it's purpose remains clear and this useEffect doesn't get lost in the noise
  return null
})

function awaitLoadActionDispatchedByPersistenceMachine(): Promise<{ projectId: string }> {
  invariant(
    PubSub.countSubscriptions(LoadActionsDispatched) === 0,
    'At this point, awaitLoadActionDispatchedByPersistenceMachine should have zero listeners',
  )
  return new Promise((resolve, reject) => {
    const listener = (message: string, data: { projectId: string }) => {
      PubSub.unsubscribe(listener)
      resolve(data)
    }
    PubSub.subscribe(LoadActionsDispatched, listener)
  })
}

export function getGithubRepoToLoad(urlSearchParams: string): GithubRepoWithBranch | null {
  const urlParams = new URLSearchParams(urlSearchParams)
  const githubBranch = urlParams.get('github_branch')

  const githubCloneUrl = urlParams.get(CloneParamKey)
  if (githubCloneUrl != null) {
    const splitGitRepoUrl = githubCloneUrl.split('/')
    return {
      owner: splitGitRepoUrl[0],
      repository: splitGitRepoUrl[1],
      branch: githubBranch,
    }
  }

  const githubOwner = urlParams.get('github_owner')
  const githubRepo = urlParams.get('github_repo')
  if (githubOwner != null && githubRepo != null) {
    return {
      owner: githubOwner,
      repository: githubRepo,
      branch: githubBranch,
    }
  }

  return null
}
