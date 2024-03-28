import type { LoaderFunctionArgs } from '@remix-run/node'
import { validateProjectAccess } from '../handlers/validators'
import { proxy } from '../util/proxy.server'
import { UserProjectPermission } from '~/types'
import { redirect } from '@remix-run/react'
import { getProjectIdFromParams, getResponseWithValidation } from '../util/api.server'

const validator = validateProjectAccess(UserProjectPermission.CAN_VIEW_PROJECT, {
  canRequestAccess: true,
  getProjectId: (params) => getProjectIdFromParams(params, 'id'),
})
// due to Remix's current issue with gzip responses (https://github.com/remix-run/remix/issues/6697),
// we need to remove this header from the response
const excludeHeaders = new Set(['content-encoding'])

export async function loader(args: LoaderFunctionArgs) {
  try {
    return await getResponseWithValidation(
      args.request,
      args.params,
      (req: Request) => proxy(req, { rawOutput: true }),
      { validator: validator, excludeHeaders: excludeHeaders },
    )
  } catch (e) {
    throw redirect(`/project/${args.params.id}`)
  }
}