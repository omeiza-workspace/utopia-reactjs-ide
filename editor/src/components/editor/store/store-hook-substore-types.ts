import { uniq } from '../../../core/shared/array-utils'
import { omit, pick } from '../../../core/shared/object-utils'
import { EditorDispatch } from '../action-types'
import type {
  DerivedState,
  EditorState,
  EditorStorePatched,
  EditorStoreShared,
  ThemeSetting,
} from './editor-state'
import { EmptyEditorStateForKeysOnly } from './store-hook-substore-helpers'

export type Substates = {
  metadata: MetadataSubstate
  selectedViews: SelectedViewsSubstate
  focusedElement: FocusedElementPathSubstate
  highlightedHoveredViews: HighlightedHoveredViewsSubstate
  projectContents: ProjectContentSubstate
  canvas: CanvasSubstate
  canvasOffset: CanvasOffsetSubstate
  derived: { derived: DerivedState }
  restOfEditor: RestOfEditorState
  restOfStore: Omit<EditorStorePatched, 'editor' | 'derived'>
  /**@deprecated hurts performance, please avoid using it */
  fullStore: EditorStorePatched
  theme: ThemeSubstate
  github: GithubSubstate
  builtInDependencies: BuiltInDependenciesSubstate
  userState: UserStateSubstate
}

export type StoreKey = keyof Substates

// ProjectContentSubstate
export const projectContentsKeys = ['projectContents'] as const
const emptyProjectContents = {
  editor: pick(projectContentsKeys, EmptyEditorStateForKeysOnly),
} as const
export type ProjectContentSubstate = typeof emptyProjectContents

// MetadataSubstate
export const metadataSubstateKeys = [
  'selectedViews',
  'focusedElementPath',
  'spyMetadata',
  'domMetadata',
  'jsxMetadata',
  'allElementProps',
] as const
const emptyMetadataSubstate = {
  editor: pick(metadataSubstateKeys, EmptyEditorStateForKeysOnly),
} as const
export type MetadataSubstate = typeof emptyMetadataSubstate

// SelectedViewsSubstate
export const selectedViewsSubstateKeys = ['selectedViews'] as const
const emptySelectedViewsSubstate = {
  editor: pick(selectedViewsSubstateKeys, EmptyEditorStateForKeysOnly),
} as const
export type SelectedViewsSubstate = typeof emptySelectedViewsSubstate

// FocusedElementPathSubstate
export const focusedElementPathSubstateKeys = ['focusedElementPath'] as const
const emptyFocusedElementPathSubstate = {
  editor: pick(focusedElementPathSubstateKeys, EmptyEditorStateForKeysOnly),
} as const
export type FocusedElementPathSubstate = typeof emptyFocusedElementPathSubstate

// HighlightedHoveredViewsSubstate
export const highlightedHoveredViewsSubstateKeys = ['highlightedViews', 'hoveredViews'] as const
const emptyHighlightedHoveredViewsSubstate = {
  editor: pick(highlightedHoveredViewsSubstateKeys, EmptyEditorStateForKeysOnly),
} as const
export type HighlightedHoveredViewsSubstate = typeof emptyHighlightedHoveredViewsSubstate

// CanvasOffsetSubstate
export const canvasOffsetSubstateKeys = [
  'realCanvasOffset',
  'roundedCanvasOffset',
  'scale',
] as const
const emptyCanvasOffsetSubstate = {
  editor: { canvas: pick(canvasOffsetSubstateKeys, EmptyEditorStateForKeysOnly.canvas) },
} as const
export type CanvasOffsetSubstate = typeof emptyCanvasOffsetSubstate

// CanvasScaleSubstate
export const canvasScaleSubstateKeys = ['scale'] as const
const emptyCanvasScaleSubstate = {
  editor: { canvas: pick(['scale'], EmptyEditorStateForKeysOnly.canvas) },
} as const
export type CanvasScaleSubstate = typeof emptyCanvasScaleSubstate

// CanvasSubstate
const canvasKey = ['canvas'] as const
const emptyCanvasSubstate = {
  editor: {
    canvas: omit(
      [
        // TODO how to use the type of canvasOffsetSubstateKeys here?
        'realCanvasOffset',
        'roundedCanvasOffset',
      ],
      EmptyEditorStateForKeysOnly.canvas,
    ),
  },
} as const
export type CanvasSubstate = typeof emptyCanvasSubstate
export const canvasSubstateKeys = Object.keys(emptyCanvasSubstate.editor.canvas) as Array<
  keyof CanvasSubstate['editor']['canvas']
>

export interface DerivedSubstate {
  derived: DerivedState
}

export interface DispatchSubstate {
  dispatch: EditorDispatch
}

export interface ThemeSubstate {
  userState: { themeConfig: ThemeSetting | null }
}

// GithubSubstate
export const githubSubstateKeys = [
  'githubSettings',
  'githubOperations',
  'githubChecksums',
  'githubData',
  'assetChecksums',
] as const
export const emptyGithubSubstate = {
  editor: pick(githubSubstateKeys, EmptyEditorStateForKeysOnly),
} as const
export type GithubSubstate = typeof emptyGithubSubstate

// All the EditorState substate keys
const editorSubstatesKeysCollected = uniq([
  ...projectContentsKeys,
  ...metadataSubstateKeys,
  ...selectedViewsSubstateKeys,
  ...focusedElementPathSubstateKeys,
  ...highlightedHoveredViewsSubstateKeys,
  ...canvasKey,
])
const emptyRestOfEditorState = {
  editor: omit(editorSubstatesKeysCollected, EmptyEditorStateForKeysOnly),
} as const
export type RestOfEditorState = typeof emptyRestOfEditorState
export const restOfEditorStateKeys = Object.keys(emptyRestOfEditorState.editor) as Array<
  keyof RestOfEditorState['editor']
>

export type BuiltInDependenciesSubstate = {
  builtInDependencies: EditorStoreShared['builtInDependencies']
}

export type UserStateSubstate = {
  userState: EditorStoreShared['userState']
}

export type CanvasAndMetadataSubstate = {
  editor: Pick<EditorState, 'jsxMetadata'>
} & CanvasSubstate

export const restOfStoreKeys: ReadonlyArray<keyof Omit<EditorStorePatched, 'editor' | 'derived'>> =
  ['storeName', 'strategyState', 'history', 'workers', 'persistence', 'alreadySaved']