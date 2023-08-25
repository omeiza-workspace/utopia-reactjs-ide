import { defaultEither } from '../shared/either'
import type { JSXAttributes } from '../shared/element-template'
import { unsetJSXValuesAtPaths } from '../shared/jsx-attributes'
import type { PropertyPath } from '../shared/project-file-types'
import * as PP from '../shared/property-path'

export const MarginPropertyPaths: Array<PropertyPath> = [
  PP.create('style', 'margin'),
  PP.create('style', 'marginBlock'),
  PP.create('style', 'marginBlockEnd'),
  PP.create('style', 'marginBlockStart'),
  PP.create('style', 'marginBottom'),
  PP.create('style', 'marginInline'),
  PP.create('style', 'marginInlineEnd'),
  PP.create('style', 'marginInlineStart'),
  PP.create('style', 'marginLeft'),
  PP.create('style', 'marginRight'),
  PP.create('style', 'marginTop'),
  PP.create('style', 'marginTrim'),
]

export const PaddingPropertyPaths: Array<PropertyPath> = [
  PP.create('style', 'padding'),
  PP.create('style', 'paddingBlock'),
  PP.create('style', 'paddingBlockEnd'),
  PP.create('style', 'paddingBlockStart'),
  PP.create('style', 'paddingBottom'),
  PP.create('style', 'paddingInline'),
  PP.create('style', 'paddingInlineEnd'),
  PP.create('style', 'paddingInlineStart'),
  PP.create('style', 'paddingLeft'),
  PP.create('style', 'paddingRight'),
  PP.create('style', 'paddingTop'),
]

export function removePaddingProperties(jsxAttributes: JSXAttributes): JSXAttributes {
  return defaultEither(jsxAttributes, unsetJSXValuesAtPaths(jsxAttributes, PaddingPropertyPaths))
}

export function removeMarginProperties(jsxAttributes: JSXAttributes): JSXAttributes {
  return defaultEither(jsxAttributes, unsetJSXValuesAtPaths(jsxAttributes, MarginPropertyPaths))
}