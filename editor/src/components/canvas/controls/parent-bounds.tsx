import React from 'react'
import { MetadataUtils } from '../../../core/model/element-metadata-utils'
import { mapDropNulls, stripNulls, uniqBy } from '../../../core/shared/array-utils'
import * as EP from '../../../core/shared/element-path'
import { useColorTheme } from '../../../uuiui'
import { useEditorState } from '../../editor/store/store-hook'
import { CanvasOffsetWrapper } from './canvas-offset-wrapper'
import { CenteredCrossSVG } from './outline-control'

export const ParentBounds = React.memo(() => {
  const scale = useEditorState((store) => store.editor.canvas.scale, 'ParentBounds canvas scale')
  const parentFrames = useEditorState((store) => {
    const targetParents = uniqBy(
      stripNulls(store.editor.selectedViews.map((view) => EP.parentPath(view))),
      EP.pathsEqual,
    )
    return mapDropNulls((parentPath) => {
      return MetadataUtils.getFrameInCanvasCoords(parentPath, store.editor.jsxMetadata)
    }, targetParents)
  }, 'ParentBounds frames')

  return (
    <>
      {parentFrames.map((frame, i) => {
        return (
          <CanvasOffsetWrapper key={`parent-outline-${i}`}>
            <CenteredCrossSVG
              id='parent-cross-top-left'
              centerX={frame.x}
              centerY={frame.y}
              scale={scale}
            />

            <CenteredCrossSVG
              id='parent-cross-top-right'
              centerX={frame.x + frame.width}
              centerY={frame.y}
              scale={scale}
            />
            <CenteredCrossSVG
              id='parent-cross-bottom-right'
              centerX={frame.x + frame.width}
              centerY={frame.y + frame.height}
              scale={scale}
            />
            <CenteredCrossSVG
              id='parent-cross-bottom-left'
              centerX={frame.x}
              centerY={frame.y + frame.height}
              scale={scale}
            />
          </CanvasOffsetWrapper>
        )
      })}
    </>
  )
})