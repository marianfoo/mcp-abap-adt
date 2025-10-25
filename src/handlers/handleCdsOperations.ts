import { McpError, ErrorCode, AxiosResponse } from '../lib/utils';
import { 
    makeAdtRequest, 
    return_error, 
    return_response, 
    getBaseUrl,
    btoa,
    formatQS,
    fullParse,
    isArray,
    toInt,
    xmlArray,
    xmlNode,
    xmlNodeAttr
} from '../lib/utils';

// ===== Interfaces and Types =====

export interface DdicAnnotation {
    key: string;
    value: string;
}

export interface DdicProperties {
    elementProps?: {
        ddicIsKey: boolean;
        ddicDataElement: string;
        ddicDataType: string;
        ddicLength: number;
        ddicDecimals?: number;
        ddicHeading?: string;
        ddicLabelShort?: string;
        ddicLabelMedium?: string;
        ddicLabelLong?: string;
        ddicHeadingLength?: number;
        ddicLabelShortLength?: number;
        ddicLabelMediumLength?: number;
        ddicLabelLongLength?: number;
        parentName?: string;
    };
    annotations: DdicAnnotation[];
}

export interface DdicElement {
    type: string;
    name: string;
    properties: DdicProperties;
    children: DdicElement[];
}

// ===== Helper Functions =====

function parseDDICProps(raw: any): DdicProperties {
    const converted = xmlArray(raw, "abapsource:entry").reduce(
        (prev: any, cur: any) => {
            // xml-js puts attributes under _attributes key
            const key = cur._attributes?.["abapsource:key"];
            const value = cur._text || cur["#text"];
            if (key) {
                prev[key] = value;
            }
            return prev;
        },
        {}
    ) as any;

    const {
        ddicIsKey,
        ddicDataElement,
        ddicDataType,
        ddicLength,
        ddicDecimals,
        ddicHeading,
        ddicLabelShort,
        ddicLabelMedium,
        ddicLabelLong,
        ddicHeadingLength,
        ddicLabelShortLength,
        ddicLabelMediumLength,
        ddicLabelLongLength,
        parentName,
        ...rawanno
    } = converted;

    const elementProps = (ddicDataType || ddicDataType === "") && {
        ddicIsKey: ddicIsKey === "true", // Properly parse string boolean
        ddicDataElement,
        ddicDataType,
        ddicLength: ddicLength ? parseInt(ddicLength, 10) : undefined,
        ddicDecimals: ddicDecimals ? parseInt(ddicDecimals, 10) : undefined,
        ddicHeading,
        ddicLabelShort,
        ddicLabelMedium,
        ddicLabelLong,
        ddicHeadingLength: ddicHeadingLength ? parseInt(ddicHeadingLength, 10) : undefined,
        ddicLabelShortLength: ddicLabelShortLength ? parseInt(ddicLabelShortLength, 10) : undefined,
        ddicLabelMediumLength: ddicLabelMediumLength ? parseInt(ddicLabelMediumLength, 10) : undefined,
        ddicLabelLongLength: ddicLabelLongLength ? parseInt(ddicLabelLongLength, 10) : undefined,
        parentName
    };

    const annotations: DdicAnnotation[] = [];

    // Parse annotations from the raw data
    for (const key in rawanno) {
        const match = key.match(/annotation(Key|Value)\.([0-9]+)/);
        if (match) {
            const mtype = match[1];
            const idx = toInt(match[2]);
            const anno = annotations[idx] || { key: "", value: "" };
            if (mtype === "Key") anno.key = rawanno[key];
            else anno.value = rawanno[key];
            annotations[idx] = anno;
        }
    }

    return {
        elementProps,
        annotations
    } as DdicProperties;
}

function parseDdicElement(raw: any): DdicElement {
    // xml-js puts attributes under _attributes key
    const type = raw._attributes?.["adtcore:type"] as string;
    const name = raw._attributes?.["adtcore:name"] as string;
    const properties = parseDDICProps(raw["abapsource:properties"]);
    const children = xmlArray(raw, "abapsource:elementInfo").map(
        parseDdicElement
    ) as DdicElement[];
    return { type, name, properties, children } as DdicElement;
}

// ===== Handler Functions =====

/**
 * Handle reading CDS view information and structure
 */
export async function handleGetCdsView(args: any) {
    try {
        if (!args?.path) {
            throw new McpError(ErrorCode.InvalidParams, 'Path is required');
        }

        const { 
            path, 
            getTargetForAssociation = false, 
            getExtensionViews = true, 
            getSecondaryObjects = true 
        } = args;

        const qs = formatQS({
            getTargetForAssociation,
            getExtensionViews,
            getSecondaryObjects,
            path
        });

        // Note: Accept headers should be handled in makeAdtRequest
        const response = await makeAdtRequest(
            `${await getBaseUrl()}/sap/bc/adt/ddic/ddl/elementinfo?${qs}`,
            'GET',
            30000,
            undefined,
            undefined
        );

        const raw = fullParse(response.data);
        const element = parseDdicElement(raw["abapsource:elementInfo"]);

        return {
            isError: false,
            content: [{
                type: 'text',
                text: JSON.stringify(element, null, 2)
            }]
        };
    } catch (error) {
        return return_error(error);
    }
}
