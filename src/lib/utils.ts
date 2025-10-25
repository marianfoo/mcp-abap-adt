import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { Agent } from 'https';
import { AxiosResponse } from 'axios';
import { getConfig, SapConfig } from './server';
import convert from 'xml-js';

export { McpError, ErrorCode, AxiosResponse };

export function return_response(response: AxiosResponse, jsonTransformer?: (data: any) => any) {
    // Check if RETURN_RAW_XML environment variable is set to true
    const returnRawXml = process.env.RETURN_RAW_XML === 'true';
    
    // If raw XML is requested AND there's a transformer (XML API), return raw XML
    if (returnRawXml && jsonTransformer) {
        return {
            isError: false,
            content: [{
                type: 'text',
                text: response.data
            }]
        };
    }
    
    // If a JSON transformer is provided, parse the XML and transform it
    if (jsonTransformer) {
        try {
            const parsed = fullParse(response.data);
            const transformed = jsonTransformer(parsed);
            return {
                isError: false,
                content: [{
                    type: 'text',
                    text: JSON.stringify(transformed, null, 2)
                }]
            };
        } catch (error) {
            // If transformation fails, fall back to raw response
            return {
                isError: false,
                content: [{
                    type: 'text',
                    text: response.data
                }]
            };
        }
    }
    
    // Default behavior: return raw response (for string APIs)
    return {
        isError: false,
        content: [{
            type: 'text',
            text: response.data
        }]
    };
}
export function return_error(error: any) {
    return {
        isError: true,
        content: [{
            type: 'text',
            text: `Error: ${error instanceof AxiosError ? String(error.response?.data)
                : error instanceof Error ? error.message
                    : String(error)}`
        }]
    };
}

let axiosInstance: AxiosInstance | null = null;
export function createAxiosInstance() {
    if (!axiosInstance) {
        axiosInstance = axios.create({
            httpsAgent: new Agent({
                rejectUnauthorized: false // Allow self-signed certificates
            })
        });
    }
    return axiosInstance;
}

// Cleanup function for tests
export function cleanup() {
    if (axiosInstance) {
        // Clear any interceptors
        const reqInterceptor = axiosInstance.interceptors.request.use((config) => config);
        const resInterceptor = axiosInstance.interceptors.response.use((response) => response);
        axiosInstance.interceptors.request.eject(reqInterceptor);
        axiosInstance.interceptors.response.eject(resInterceptor);
    }
    axiosInstance = null;
    config = undefined;
    csrfToken = null;
    cookies = null;
}

let config: SapConfig | undefined;
let csrfToken: string | null = null;
let cookies: string | null = null; // Variable to store cookies

export async function getBaseUrl() {
    if (!config) {
        config = getConfig();
    }
    const { url } = config;
    try {
        const urlObj = new URL(url);
        const baseUrl = Buffer.from(`${urlObj.origin}`);
        return baseUrl;
    } catch (error) {
        const errorMessage = `Invalid URL in configuration: ${error instanceof Error ? error.message : error}`;
        throw new Error(errorMessage);
    }
}

export async function getAuthHeaders() {
    if (!config) {
        config = getConfig();
    }
    const { username, password, client } = config;
    const auth = Buffer.from(`${username}:${password}`).toString('base64'); // Create Basic Auth string
    return {
        'Authorization': `Basic ${auth}`, // Basic Authentication header
        'X-SAP-Client': client            // SAP client header
    };
}

async function fetchCsrfToken(url: string): Promise<string> {
    try {
        const response = await createAxiosInstance()({
            method: 'GET',
            url,
            headers: {
                ...(await getAuthHeaders()),
                'x-csrf-token': 'fetch'
            }
        });

        const token = response.headers['x-csrf-token'];
        if (!token) {
            throw new Error('No CSRF token in response headers');
        }

        // Extract and store cookies
        if (response.headers['set-cookie']) {
            cookies = response.headers['set-cookie'].join('; ');
        }

        return token;
    } catch (error) {
        // Even if the request fails, try to get token from error response
        if (error instanceof AxiosError && error.response?.headers['x-csrf-token']) {
            const token = error.response.headers['x-csrf-token'];
            if (token) {
                 // Extract and store cookies from the error response as well
                if (error.response.headers['set-cookie']) {
                    cookies = error.response.headers['set-cookie'].join('; ');
                }
                return token;
            }
        }
        // If we couldn't get token from error response either, throw the original error
        throw new Error(`Failed to fetch CSRF token: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function makeAdtRequest(url: string, method: string, timeout: number, data?: any, params?: any) {
    // For POST/PUT requests, ensure we have a CSRF token
    if ((method === 'POST' || method === 'PUT') && !csrfToken) {
        try {
            csrfToken = await fetchCsrfToken(url);
        } catch (error) {
            throw new Error('CSRF token is required for POST/PUT requests but could not be fetched');
        }
    }

    const requestHeaders = {
        ...(await getAuthHeaders())
    };

    // Add CSRF token for POST/PUT requests
    if ((method === 'POST' || method === 'PUT') && csrfToken) {
        requestHeaders['x-csrf-token'] = csrfToken;
    }

    // Add cookies if available
    if (cookies) {
        requestHeaders['Cookie'] = cookies;
    }

    const config: any = {
        method,
        url,
        headers: requestHeaders,
        timeout,
        params: params
    };

    // Include data in the request configuration if provided
    if (data) {
        config.data = data;
    }

    try {
        const response = await createAxiosInstance()(config);
        return response;
    } catch (error) {
        // If we get a 403 with "CSRF token validation failed", try to fetch a new token and retry
        if (error instanceof AxiosError && error.response?.status === 403 &&
            error.response.data?.includes('CSRF')) {
            csrfToken = await fetchCsrfToken(url);
            config.headers['x-csrf-token'] = csrfToken;
            return await createAxiosInstance()(config);
        }
        throw error;
    }
}

// ===== CDS Utility Functions =====

/**
 * Base64 encoding function (Node.js equivalent of browser btoa)
 */
export function btoa(str: string): string {
    return Buffer.from(str, 'utf8').toString('base64');
}

/**
 * Format query string parameters
 */
export function formatQS(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, String(v)));
        } else if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
        }
    });
    
    return searchParams.toString();
}

/**
 * Full XML parse using xml-js library
 */
export function fullParse(xmlString: string): any {
    return convert.xml2js(xmlString, { compact: true });
}

/**
 * Navigate XML nodes safely
 */
export function xmlNode(obj: any, ...path: string[]): any {
    let current = obj;
    for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return undefined;
        }
    }
    return current?._text || current;
}

/**
 * Get XML node attributes
 */
export function xmlNodeAttr(obj: any): Record<string, string> {
    if (!obj || typeof obj !== 'object') return {};
    
    // Handle xml-js format with _attributes
    if (obj._attributes && typeof obj._attributes === 'object') {
        return { ...obj._attributes };
    }
    
    // Handle older format with @_ prefix
    const attrs: Record<string, string> = {};
    Object.keys(obj).forEach(key => {
        if (key.startsWith('@_')) {
            attrs[key.substring(2)] = obj[key];
        }
    });
    return attrs;
}

/**
 * Convert XML node to array format
 */
export function xmlArray(obj: any, ...path: string[]): any[] {
    const node = xmlNode(obj, ...path);
    if (!node) return [];
    return Array.isArray(node) ? node : [node];
}

/**
 * Check if value is an array
 */
export function isArray(value: any): value is any[] {
    return Array.isArray(value);
}

/**
 * Safe integer conversion
 */
export function toInt(value: any): number {
    const num = parseInt(String(value), 10);
    return isNaN(num) ? 0 : num;
}

// ===== SAP ADT Response Transformers =====

/**
 * Transform ABAP source code response to JSON
 */
export function transformAbapSource(parsed: any): any {
    const source = xmlNode(parsed, 'abapsource:abap');
    if (!source) return { source: parsed };
    
    return {
        type: 'abap_source',
        content: source,
        metadata: {
            contentType: xmlNodeAttr(parsed['abapsource:abap'])
        }
    };
}

/**
 * Transform search results to JSON
 */
export function transformSearchResults(parsed: any): any {
    const searchResult = parsed['adtcore:objectReferences'] || parsed;
    const objects = xmlArray(searchResult, 'adtcore:objectReference');
    
    return {
        type: 'search_results',
        totalCount: objects.length,
        results: objects.map((obj: any) => {
            // xml-js puts attributes under _attributes key
            const attrs = obj._attributes || {};
            
            return {
                name: attrs['adtcore:name'] || '',
                type: attrs['adtcore:type'] || '',
                uri: attrs['adtcore:uri'] || '',
                description: attrs['adtcore:description'] || '', 
                packageName: attrs['adtcore:packageName'] || ''
            };
        })
    };
}

/**
 * Transform table structure to JSON
 */
export function transformTableStructure(parsed: any): any {
    // Look for various possible root elements in table responses
    const tableInfo = parsed['ddic:table'] || parsed['table'] || parsed;
    
    return {
        type: 'table_structure',
        name: xmlNodeAttr(tableInfo)['name'] || 'unknown',
        description: xmlNodeAttr(tableInfo)['description'],
        content: typeof tableInfo === 'string' ? tableInfo : JSON.stringify(tableInfo, null, 2)
    };
}

/**
 * Transform class structure to JSON
 */
export function transformClassStructure(parsed: any): any {
    const classInfo = parsed['abapsource:abap'] || parsed;
    
    return {
        type: 'class_structure',
        content: typeof classInfo === 'string' ? classInfo : classInfo,
        metadata: {
            contentType: xmlNodeAttr(parsed['abapsource:abap'])
        }
    };
}

/**
 * Transform structure definition to JSON
 */
export function transformStructureDefinition(parsed: any): any {
    const structInfo = parsed['ddic:structure'] || parsed['structure'] || parsed;
    
    return {
        type: 'structure_definition',
        content: typeof structInfo === 'string' ? structInfo : structInfo,
        metadata: {
            contentType: xmlNodeAttr(structInfo)
        }
    };
}

/**
 * Transform function definition to JSON
 */
export function transformFunctionDefinition(parsed: any): any {
    const funcInfo = parsed['abapsource:abap'] || parsed;
    
    return {
        type: 'function_definition',
        content: typeof funcInfo === 'string' ? funcInfo : funcInfo,
        metadata: {
            contentType: xmlNodeAttr(parsed['abapsource:abap'])
        }
    };
}

/**
 * Transform package information to JSON
 */
export function transformPackageInfo(parsed: any): any {
    // Handle the specific format returned by the package service
    const nodes = parsed["asx:abap"]?.["asx:values"]?.DATA?.TREE_CONTENT?.SEU_ADT_REPOSITORY_OBJ_NODE || [];
    const extractedData = (Array.isArray(nodes) ? nodes : [nodes]).filter((node: any) => 
        node.OBJECT_NAME?._text && node.OBJECT_URI?._text
    ).map((node: any) => ({
        OBJECT_TYPE: node.OBJECT_TYPE._text,
        OBJECT_NAME: node.OBJECT_NAME._text,
        OBJECT_DESCRIPTION: node.DESCRIPTION?._text,
        OBJECT_URI: node.OBJECT_URI._text
    }));
    
    return {
        type: 'package_info',
        totalObjects: extractedData.length,
        objects: extractedData
    };
}

/**
 * Transform table contents to JSON
 */
export function transformTableContents(parsed: any): any {
    const tableData = parsed['tableContents'] || parsed;
    
    return {
        type: 'table_contents',
        content: typeof tableData === 'string' ? tableData : tableData,
        metadata: {
            contentType: 'table_data'
        }
    };
}

/**
 * Transform type information to JSON
 */
export function transformTypeInfo(parsed: any): any {
    const typeInfo = parsed['typeInfo'] || parsed;
    
    return {
        type: 'type_info',
        content: typeof typeInfo === 'string' ? typeInfo : typeInfo,
        metadata: {
            contentType: 'type_definition'
        }
    };
}

/**
 * Transform transaction information to JSON
 */
export function transformTransactionInfo(parsed: any): any {
    const transInfo = parsed['transaction'] || parsed;
    
    return {
        type: 'transaction_info',
        content: typeof transInfo === 'string' ? transInfo : transInfo,
        metadata: {
            contentType: 'transaction_definition'
        }
    };
}

/**
 * Transform interface definition to JSON
 */
export function transformInterfaceDefinition(parsed: any): any {
    const intfInfo = parsed['abapsource:abap'] || parsed;
    
    return {
        type: 'interface_definition',
        content: typeof intfInfo === 'string' ? intfInfo : intfInfo,
        metadata: {
            contentType: xmlNodeAttr(parsed['abapsource:abap'])
        }
    };
}
