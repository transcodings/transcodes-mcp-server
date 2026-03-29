import type { ProxyTool } from './tool-utils.ts';

/**
 * Placeholder for `/v1/project/...` tools.
 * Many routes require Firebase JWT; add get_project / list_projects here when API-key access exists.
 * Until then use transcodes_http_request.
 */
export const projectTools: ProxyTool[] = [];
