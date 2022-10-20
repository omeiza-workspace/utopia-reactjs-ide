import {
  BakedInStoryboardUID,
  BakedInStoryboardVariableName,
} from '../../../../core/model/scene-utils'
import { windowPoint, WindowPoint } from '../../../../core/shared/math-utils'
import { cmdModifier, emptyModifiers, Modifiers } from '../../../../utils/modifiers'
import { wait } from '../../../../utils/utils.test-utils'
import { CanvasControlsContainerID } from '../../controls/new-canvas-controls'
import {
  mouseClickAtPoint,
  mouseDragFromPointWithDelta,
  pressKey,
} from '../../event-helpers.test-utils'
import {
  EditorRenderResult,
  formatTestProjectCode,
  getPrintedUiJsCode,
  renderTestEditorWithCode,
  TestAppUID,
  TestSceneUID,
} from '../../ui-jsx.test-utils'
import { MetaCanvasStrategy, RegisteredCanvasStrategies } from '../canvas-strategies'
import { CustomStrategyState, InteractionCanvasState } from '../canvas-strategy-types'
import { InteractionSession } from '../interaction-state'
import { reparentMetaStrategy } from './reparent-metastrategy'

async function dragElement(
  renderResult: EditorRenderResult,
  targetTestId: string,
  dragDelta: WindowPoint,
  modifiers: Modifiers,
  midDragCallback?: () => void,
): Promise<void> {
  const targetElement = await renderResult.renderedDOM.getByTestId(targetTestId)
  const targetElementBounds = targetElement.getBoundingClientRect()
  const canvasControlsLayer = renderResult.renderedDOM.getByTestId(CanvasControlsContainerID)

  const startPoint = windowPoint({
    x: targetElementBounds.x + targetElementBounds.width / 2,
    y: targetElementBounds.y + targetElementBounds.height / 2,
  })

  mouseClickAtPoint(canvasControlsLayer, startPoint, { modifiers: cmdModifier })
  mouseDragFromPointWithDelta(canvasControlsLayer, startPoint, dragDelta, {
    modifiers: modifiers,
    midDragCallback: midDragCallback,
  })
}

const defaultTestCode = `
  <div
    style={{
      position: 'absolute',
      width: 700,
      height: 600,
    }}
    data-uid='container'
    data-testid='container'
  >
    <div
      style={{
        width: 250,
        height: 500,
        backgroundColor: 'orange',
      }}
      data-uid='staticparent'
      data-testid='staticparent'
    />
    <div
      style={{
        position: 'absolute',
        width: 250,
        height: 500,
        left: 250,
        top: 0,
        backgroundColor: 'lightblue',
      }}
      data-uid='absoluteparent'
      data-testid='absoluteparent'
    >
      <div
        style={{
          position: 'absolute',
          left: 50,
          top: 58,
          width: 100,
          height: 100,
          backgroundColor: 'yellow',
        }}
        data-uid='absolutechild'
        data-testid='absolutechild'
      />
    </div>
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        position: 'absolute',
        width: 250,
        height: 500,
        left: 500,
        top: 0,
        backgroundColor: 'lightgreen',
      }}
      data-uid='flexparent'
      data-testid='flexparent'
    >
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'teal',
        }}
        data-uid='flexchild1'
        data-testid='flexchild1'
      />
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'red',
        }}
        data-uid='flexchild2'
        data-testid='flexchild2'
      />
    </div>
  </div>
`

function makeTestProjectCodeWithComponentInnards(componentInnards: string): string {
  const code = `
  import * as React from 'react'
  import { Scene, Storyboard, View } from 'utopia-api'

  export var App = (props) => {
${componentInnards}
  }

  export var ${BakedInStoryboardVariableName} = (props) => {
    return (
      <Storyboard data-uid='${BakedInStoryboardUID}'>
        <Scene
          style={{ left: 0, top: 0, width: 2000, height: 2000 }}
          data-uid='${TestSceneUID}'
        >
          <App
            data-uid='${TestAppUID}'
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, top: 0 }}
          />
        </Scene>
      </Storyboard>
    )
  }
`
  return formatTestProjectCode(code)
}

function makeTestProjectCodeWithSnippet(snippet: string): string {
  return makeTestProjectCodeWithComponentInnards(`
  return (
${snippet}
  )
`)
}

const forcedAbsoluteReparentMetastrategy: MetaCanvasStrategy = (
  canvasState: InteractionCanvasState,
  interactionSession: InteractionSession | null,
  customStrategyState: CustomStrategyState,
) => {
  const allReparentingStrategies = reparentMetaStrategy(
    canvasState,
    interactionSession,
    customStrategyState,
  )
  return allReparentingStrategies.filter((strategy) => strategy.id.startsWith('FORCED'))
}

describe('Forced Absolute Reparent Strategies', () => {
  it('Absolute to forced absolute can be applied', async () => {
    const renderResult = await renderTestEditorWithCode(
      makeTestProjectCodeWithSnippet(defaultTestCode),
      'await-first-dom-report',
      [forcedAbsoluteReparentMetastrategy],
    )

    const absoluteChild = await renderResult.renderedDOM.findByTestId('absolutechild')
    const absoluteChildRect = absoluteChild.getBoundingClientRect()
    const absoluteChildCenter = {
      x: absoluteChildRect.x + absoluteChildRect.width / 2,
      y: absoluteChildRect.y + absoluteChildRect.height / 2,
    }
    const secondFlexChild = await renderResult.renderedDOM.findByTestId('flexchild2')
    const secondFlexChildRect = secondFlexChild.getBoundingClientRect()
    const secondFlexChildCenter = {
      x: secondFlexChildRect.x + secondFlexChildRect.width / 2,
      y: secondFlexChildRect.y + secondFlexChildRect.height / 2,
    }

    await renderResult.getDispatchFollowUpActionsFinished()

    const dragDelta = windowPoint({
      x: secondFlexChildCenter.x - absoluteChildCenter.x,
      y: secondFlexChildCenter.y - absoluteChildCenter.y,
    })
    await dragElement(renderResult, 'absolutechild', dragDelta, cmdModifier)

    await renderResult.getDispatchFollowUpActionsFinished()

    expect(getPrintedUiJsCode(renderResult.getEditorState())).toEqual(
      makeTestProjectCodeWithSnippet(`
  <div
    style={{
      position: 'absolute',
      width: 700,
      height: 600,
    }}
    data-uid='container'
    data-testid='container'
  >
    <div
      style={{
        width: 250,
        height: 500,
        backgroundColor: 'orange',
      }}
      data-uid='staticparent'
      data-testid='staticparent'
    />
    <div
      style={{
        position: 'absolute',
        width: 250,
        height: 500,
        left: 250,
        top: 0,
        backgroundColor: 'lightblue',
      }}
      data-uid='absoluteparent'
      data-testid='absoluteparent'
    />
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        position: 'absolute',
        width: 250,
        height: 500,
        left: 500,
        top: 0,
        backgroundColor: 'lightgreen',
      }}
      data-uid='flexparent'
      data-testid='flexparent'
    >
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'teal',
        }}
        data-uid='flexchild1'
        data-testid='flexchild1'
      />
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'red',
        }}
        data-uid='flexchild2'
        data-testid='flexchild2'
      >
        <div
          style={{
            position: 'absolute',
            left: 100,
            top: 0,
            width: 100,
            height: 100,
            backgroundColor: 'yellow',
          }}
          data-uid='absolutechild'
          data-testid='absolutechild'
        />
      </div>
    </div>
  </div>`),
    )
  })

  it('Absolute to forced absolute can be accessed by using the strategy selector', async () => {
    const renderResult = await renderTestEditorWithCode(
      makeTestProjectCodeWithSnippet(defaultTestCode),
      'await-first-dom-report',
      RegisteredCanvasStrategies,
    )

    const absoluteChild = await renderResult.renderedDOM.findByTestId('absolutechild')
    const absoluteChildRect = absoluteChild.getBoundingClientRect()
    const absoluteChildCenter = {
      x: absoluteChildRect.x + absoluteChildRect.width / 2,
      y: absoluteChildRect.y + absoluteChildRect.height / 2,
    }
    const secondFlexChild = await renderResult.renderedDOM.findByTestId('flexchild2')
    const secondFlexChildRect = secondFlexChild.getBoundingClientRect()
    const secondFlexChildCenter = {
      x: secondFlexChildRect.x + secondFlexChildRect.width / 2,
      y: secondFlexChildRect.y + secondFlexChildRect.height / 2,
    }

    await renderResult.getDispatchFollowUpActionsFinished()

    const dragDelta = windowPoint({
      x: secondFlexChildCenter.x - absoluteChildCenter.x,
      y: secondFlexChildCenter.y - absoluteChildCenter.y,
    })

    await dragElement(
      renderResult,
      'absolutechild',
      dragDelta,
      cmdModifier,
      function midDragCallback() {
        pressKey('3') // this should select the Reparent (Abs, Forced) strategy
      },
    )

    await renderResult.getDispatchFollowUpActionsFinished()

    expect(getPrintedUiJsCode(renderResult.getEditorState())).toEqual(
      makeTestProjectCodeWithSnippet(`
  <div
    style={{
      position: 'absolute',
      width: 700,
      height: 600,
    }}
    data-uid='container'
    data-testid='container'
  >
    <div
      style={{
        width: 250,
        height: 500,
        backgroundColor: 'orange',
      }}
      data-uid='staticparent'
      data-testid='staticparent'
    />
    <div
      style={{
        position: 'absolute',
        width: 250,
        height: 500,
        left: 250,
        top: 0,
        backgroundColor: 'lightblue',
      }}
      data-uid='absoluteparent'
      data-testid='absoluteparent'
    />
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        position: 'absolute',
        width: 250,
        height: 500,
        left: 500,
        top: 0,
        backgroundColor: 'lightgreen',
      }}
      data-uid='flexparent'
      data-testid='flexparent'
    >
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'teal',
        }}
        data-uid='flexchild1'
        data-testid='flexchild1'
      />
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'red',
        }}
        data-uid='flexchild2'
        data-testid='flexchild2'
      >
        <div
          style={{
            position: 'absolute',
            left: 100,
            top: 0,
            width: 100,
            height: 100,
            backgroundColor: 'yellow',
          }}
          data-uid='absolutechild'
          data-testid='absolutechild'
        />
      </div>
    </div>
  </div>`),
    )
  })

  it('Absolute to forced absolute is not the default choice', async () => {
    const renderResult = await renderTestEditorWithCode(
      makeTestProjectCodeWithSnippet(defaultTestCode),
      'await-first-dom-report',
      [reparentMetaStrategy],
    )

    const absoluteChild = await renderResult.renderedDOM.findByTestId('absolutechild')
    const absoluteChildRect = absoluteChild.getBoundingClientRect()
    const absoluteChildCenter = {
      x: absoluteChildRect.x + absoluteChildRect.width / 2,
      y: absoluteChildRect.y + absoluteChildRect.height / 2,
    }
    const secondFlexChild = await renderResult.renderedDOM.findByTestId('flexchild2')
    const secondFlexChildRect = secondFlexChild.getBoundingClientRect()
    const secondFlexChildCenter = {
      x: secondFlexChildRect.x + secondFlexChildRect.width / 2,
      y: secondFlexChildRect.y + secondFlexChildRect.height / 2,
    }

    await renderResult.getDispatchFollowUpActionsFinished()

    const dragDelta = windowPoint({
      x: secondFlexChildCenter.x - absoluteChildCenter.x,
      y: secondFlexChildCenter.y - absoluteChildCenter.y,
    })
    await dragElement(renderResult, 'absolutechild', dragDelta, cmdModifier)

    await renderResult.getDispatchFollowUpActionsFinished()

    expect(getPrintedUiJsCode(renderResult.getEditorState())).toEqual(
      makeTestProjectCodeWithSnippet(`
  <div
    style={{
      position: 'absolute',
      width: 700,
      height: 600,
    }}
    data-uid='container'
    data-testid='container'
  >
    <div
      style={{
        width: 250,
        height: 500,
        backgroundColor: 'orange',
      }}
      data-uid='staticparent'
      data-testid='staticparent'
    />
    <div
      style={{
        position: 'absolute',
        width: 250,
        height: 500,
        left: 250,
        top: 0,
        backgroundColor: 'lightblue',
      }}
      data-uid='absoluteparent'
      data-testid='absoluteparent'
    />
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        position: 'absolute',
        width: 250,
        height: 500,
        left: 500,
        top: 0,
        backgroundColor: 'lightgreen',
      }}
      data-uid='flexparent'
      data-testid='flexparent'
    >
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'teal',
        }}
        data-uid='flexchild1'
        data-testid='flexchild1'
      />
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'red',
        }}
        data-uid='flexchild2'
        data-testid='flexchild2'
      />
      <div
        style={{
          position: 'relative',
          width: 100,
          height: 100,
          backgroundColor: 'yellow',
        }}
        data-uid='absolutechild'
        data-testid='absolutechild'
      />
    </div>
  </div>`),
    )
  })
  it('Flex to forced absolute can be applied', async () => {
    const renderResult = await renderTestEditorWithCode(
      makeTestProjectCodeWithSnippet(defaultTestCode),
      'await-first-dom-report',
      [forcedAbsoluteReparentMetastrategy],
    )
    const firstFlexChild = await renderResult.renderedDOM.findByTestId('flexchild1')
    const firstFlexChildRect = firstFlexChild.getBoundingClientRect()
    const firstFlexChildCenter = {
      x: firstFlexChildRect.x + firstFlexChildRect.width / 2,
      y: firstFlexChildRect.y + firstFlexChildRect.height / 2,
    }

    const staticParent = await renderResult.renderedDOM.findByTestId('staticparent')
    const staticParentRect = staticParent.getBoundingClientRect()
    const staticParentCenter = {
      x: staticParentRect.x + staticParentRect.width / 2,
      y: staticParentRect.y + staticParentRect.height / 2,
    }

    await renderResult.getDispatchFollowUpActionsFinished()

    const dragDelta = windowPoint({
      x: staticParentCenter.x - firstFlexChildCenter.x,
      y: staticParentCenter.y - firstFlexChildCenter.y,
    })
    await dragElement(renderResult, 'flexchild1', dragDelta, cmdModifier)

    await renderResult.getDispatchFollowUpActionsFinished()

    expect(getPrintedUiJsCode(renderResult.getEditorState())).toEqual(
      makeTestProjectCodeWithSnippet(`
      <div
        style={{
          position: 'absolute',
          width: 700,
          height: 600,
        }}
        data-uid='container'
        data-testid='container'
      >
        <div
          style={{
            width: 250,
            height: 500,
            backgroundColor: 'orange',
          }}
          data-uid='staticparent'
          data-testid='staticparent'
        >
          <div
            style={{
              width: 100,
              height: 100,
              backgroundColor: 'teal',
              position: 'absolute',
              left: 75,
              top: 200,
            }}
            data-uid='flexchild1'
            data-testid='flexchild1'
          />
        </div>
        <div
          style={{
            position: 'absolute',
            width: 250,
            height: 500,
            left: 250,
            top: 0,
            backgroundColor: 'lightblue',
          }}
          data-uid='absoluteparent'
          data-testid='absoluteparent'
        >
          <div
            style={{
              position: 'absolute',
              left: 50,
              top: 58,
              width: 100,
              height: 100,
              backgroundColor: 'yellow',
            }}
            data-uid='absolutechild'
            data-testid='absolutechild'
          />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            position: 'absolute',
            width: 250,
            height: 500,
            left: 500,
            top: 0,
            backgroundColor: 'lightgreen',
          }}
          data-uid='flexparent'
          data-testid='flexparent'
        >
          <div
            style={{
              width: 100,
              height: 100,
              backgroundColor: 'red',
            }}
            data-uid='flexchild2'
            data-testid='flexchild2'
          />
        </div>
      </div>`),
    )
  })
  it('Flex to forced absolute is not the default choice', async () => {
    const renderResult = await renderTestEditorWithCode(
      makeTestProjectCodeWithSnippet(defaultTestCode),
      'await-first-dom-report',
      [reparentMetaStrategy],
    )
    const firstFlexChild = await renderResult.renderedDOM.findByTestId('flexchild1')
    const firstFlexChildRect = firstFlexChild.getBoundingClientRect()
    const firstFlexChildCenter = {
      x: firstFlexChildRect.x + firstFlexChildRect.width / 2,
      y: firstFlexChildRect.y + firstFlexChildRect.height / 2,
    }

    const staticParent = await renderResult.renderedDOM.findByTestId('staticparent')
    const staticParentRect = staticParent.getBoundingClientRect()
    const staticParentCenter = {
      x: staticParentRect.x + staticParentRect.width / 2,
      y: staticParentRect.y + staticParentRect.height / 2,
    }

    await renderResult.getDispatchFollowUpActionsFinished()

    const dragDelta = windowPoint({
      x: staticParentCenter.x - firstFlexChildCenter.x,
      y: staticParentCenter.y - firstFlexChildCenter.y,
    })
    await dragElement(renderResult, 'flexchild1', dragDelta, cmdModifier)

    await renderResult.getDispatchFollowUpActionsFinished()

    expect(getPrintedUiJsCode(renderResult.getEditorState())).toEqual(
      makeTestProjectCodeWithSnippet(`
      <div
        style={{
          position: 'absolute',
          width: 700,
          height: 600,
        }}
        data-uid='container'
        data-testid='container'
      >
        <div
          style={{
            width: 250,
            height: 500,
            backgroundColor: 'orange',
          }}
          data-uid='staticparent'
          data-testid='staticparent'
        />
        <div
          style={{
            position: 'absolute',
            width: 250,
            height: 500,
            left: 250,
            top: 0,
            backgroundColor: 'lightblue',
          }}
          data-uid='absoluteparent'
          data-testid='absoluteparent'
        >
          <div
            style={{
              position: 'absolute',
              left: 50,
              top: 58,
              width: 100,
              height: 100,
              backgroundColor: 'yellow',
            }}
            data-uid='absolutechild'
            data-testid='absolutechild'
          />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            position: 'absolute',
            width: 250,
            height: 500,
            left: 500,
            top: 0,
            backgroundColor: 'lightgreen',
          }}
          data-uid='flexparent'
          data-testid='flexparent'
        >
          <div
            style={{
              width: 100,
              height: 100,
              backgroundColor: 'red',
            }}
            data-uid='flexchild2'
            data-testid='flexchild2'
          />
        </div>
        <div
          style={{
            width: 100,
            height: 100,
            backgroundColor: 'teal',
            position: 'absolute',
            left: 75,
            top: 200,
          }}
          data-uid='flexchild1'
          data-testid='flexchild1'
        />
      </div>`),
    )
  })
  it('Absolute to absolute on a target parent element without size', async () => {
    const testCode = `
      <div
        style={{
          position: 'relative',
          width: 400,
          height: 400,
        }}
        data-uid='container'
        data-testid='container'
      >
        <div
          style={{ position: 'absolute' }}
          data-uid='bbb'
          data-testid='bbb'
        />
        <div
          style={{
            position: 'absolute',
            backgroundColor: 'hotpink',
            left: 10,
            top: 10,
            height: 40,
            width: 40,
          }}
          data-uid='ccc'
          data-testid='ccc'
        />
      </div>
    `
    const renderResult = await renderTestEditorWithCode(
      makeTestProjectCodeWithSnippet(testCode),
      'await-first-dom-report',
      [reparentMetaStrategy],
    )

    await renderResult.getDispatchFollowUpActionsFinished()

    const draggedElement = await renderResult.renderedDOM.findByTestId('ccc')
    const draggedElementRect = draggedElement.getBoundingClientRect()
    const draggedElementRectCenter = {
      x: draggedElementRect.x + draggedElementRect.width / 2,
      y: draggedElementRect.y + draggedElementRect.height / 2,
    }

    const zeroSizeParentTarget = await renderResult.renderedDOM.findByTestId('bbb')
    const zeroSizeParentTargetRect = zeroSizeParentTarget.getBoundingClientRect()
    const zeroSizeParentTargetCenter = {
      x: zeroSizeParentTargetRect.x + zeroSizeParentTargetRect.width / 2,
      y: zeroSizeParentTargetRect.y + zeroSizeParentTargetRect.height / 2,
    }

    const dragDelta = windowPoint({
      x: zeroSizeParentTargetCenter.x - draggedElementRectCenter.x,
      y: zeroSizeParentTargetCenter.y - draggedElementRectCenter.y,
    })
    await dragElement(renderResult, 'ccc', dragDelta, cmdModifier)

    await renderResult.getDispatchFollowUpActionsFinished()

    expect(getPrintedUiJsCode(renderResult.getEditorState())).toEqual(
      makeTestProjectCodeWithSnippet(`
      <div
        style={{
          position: 'relative',
          width: 400,
          height: 400,
        }}
        data-uid='container'
        data-testid='container'
      >
        <div
          style={{ position: 'absolute' }}
          data-uid='bbb'
          data-testid='bbb'
        >
          <div
            style={{
              position: 'absolute',
              backgroundColor: 'hotpink',
              left: -20,
              top: -20,
              height: 40,
              width: 40,
            }}
            data-uid='ccc'
            data-testid='ccc'
          />
        </div>
      </div>
      `),
    )
  })
})