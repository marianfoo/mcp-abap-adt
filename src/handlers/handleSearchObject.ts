import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl, transformSearchResults } from '../lib/utils';

export async function handleSearchObject(args: any) {
    try {
        if (!args?.query) {
            throw new McpError(ErrorCode.InvalidParams, 'Search query is required');
        }
        const maxResults = args.maxResults || 100;
        const encodedQuery = encodeURIComponent(args.query);
        const url = `${await getBaseUrl()}/sap/bc/adt/repository/informationsystem/search?operation=quickSearch&query=${encodedQuery}&maxResults=${maxResults}`;
        const response = await makeAdtRequest(url, 'GET', 30000);
        return return_response(response, transformSearchResults);
    } catch (error) {
        return return_error(error);
    }
}
