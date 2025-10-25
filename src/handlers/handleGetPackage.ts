import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { makeAdtRequest, return_error, return_response, getBaseUrl, transformPackageInfo } from '../lib/utils';
import convert from 'xml-js';

export async function handleGetPackage(args: any) {
    try {
        if (!args?.package_name) {
            throw new McpError(ErrorCode.InvalidParams, 'Package name is required');
        }

        const nodeContentsUrl = `${await getBaseUrl()}/sap/bc/adt/repository/nodestructure`;
        const encodedPackageName = encodeURIComponent(args.package_name);
        const nodeContentsParams = {
            parent_type: "DEVC/K",
            parent_name: encodedPackageName,
            withShortDescriptions: true
        };

        const package_structure_response = await makeAdtRequest(nodeContentsUrl, 'POST', 30000, undefined, nodeContentsParams);
        return return_response(package_structure_response, transformPackageInfo);

    } catch (error) {
        return return_error(error);
    }
}
