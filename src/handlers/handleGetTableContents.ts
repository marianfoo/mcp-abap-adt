import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl } from '../lib/utils';

export async function handleGetTableContents(args: any) {
    try {
        if (!args?.table_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Table name is required');
        }
        const maxRows = args.max_rows || 100;
        const encodedTableName = encodeURIComponent(args.table_name);
        
        // NOTE: This service requires a custom SAP service implementation
        // You need to implement /z_mcp_abap_adt/z_tablecontent/ in your SAP system
        const url = `${await getBaseUrl()}/z_mcp_abap_adt/z_tablecontent/${encodedTableName}?maxRows=${maxRows}`;
        const response = await makeAdtRequest(url, 'GET', 30000);
        return return_response(response); // Return raw response (likely JSON from custom service)
    } catch (error) {
        // Enhanced error message for GetTableContents since it requires custom implementation
        const errorMsg = `GetTableContents requires custom SAP service '/z_mcp_abap_adt/z_tablecontent/'. Original error: ${error}`;
        return return_error(new Error(errorMsg));
    }
}
