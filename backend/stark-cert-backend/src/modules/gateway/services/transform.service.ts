import { Injectable } from '@nestjs/common';

interface TransformRule {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  requestTransform?: (data: any) => any;
  responseTransform?: (data: any) => any;
  headersTransform?: (headers: Record<string, any>) => Record<string, any>;
}

@Injectable()
export class TransformService {
  private transformRules: Map<string, TransformRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // Add default transformation rules
    this.addTransformRule({
      id: 'default-json',
      name: 'Default JSON Transform',
      endpoint: '*',
      method: '*',
      requestTransform: (data) => {
        if (typeof data === 'string') {
          try {
            return JSON.parse(data);
          } catch {
            return data;
          }
        }
        return data;
      },
      responseTransform: (data) => {
        if (typeof data === 'object' && data !== null) {
          return JSON.stringify(data);
        }
        return data;
      },
    });

    // Add XML to JSON transformation
    this.addTransformRule({
      id: 'xml-to-json',
      name: 'XML to JSON Transform',
      endpoint: '/api/xml/*',
      method: 'GET',
      responseTransform: (data) => {
        if (typeof data === 'string' && data.includes('<?xml')) {
          return this.xmlToJson(data);
        }
        return data;
      },
    });
  }

  addTransformRule(rule: TransformRule): void {
    this.transformRules.set(rule.id, rule);
  }

  removeTransformRule(ruleId: string): boolean {
    return this.transformRules.delete(ruleId);
  }

  getTransformRule(ruleId: string): TransformRule | undefined {
    return this.transformRules.get(ruleId);
  }

  getAllTransformRules(): TransformRule[] {
    return Array.from(this.transformRules.values());
  }

  transformRequest(
    endpoint: string,
    method: string,
    data: any,
    headers: Record<string, any> = {},
  ): { data: any; headers: Record<string, any> } {
    const applicableRules = this.getApplicableRules(endpoint, method);

    let transformedData = data;
    let transformedHeaders = { ...headers };

    for (const rule of applicableRules) {
      if (rule.requestTransform) {
        transformedData = rule.requestTransform(transformedData);
      }
      if (rule.headersTransform) {
        transformedHeaders = rule.headersTransform(transformedHeaders);
      }
    }

    return { data: transformedData, headers: transformedHeaders };
  }

  transformResponse(
    endpoint: string,
    method: string,
    data: any,
    headers: Record<string, any> = {},
  ): { data: any; headers: Record<string, any> } {
    const applicableRules = this.getApplicableRules(endpoint, method);

    let transformedData = data;
    let transformedHeaders = { ...headers };

    for (const rule of applicableRules) {
      if (rule.responseTransform) {
        transformedData = rule.responseTransform(transformedData);
      }
      if (rule.headersTransform) {
        transformedHeaders = rule.headersTransform(transformedHeaders);
      }
    }

    return { data: transformedData, headers: transformedHeaders };
  }

  private getApplicableRules(endpoint: string, method: string): TransformRule[] {
    const applicableRules: TransformRule[] = [];

    for (const rule of this.transformRules.values()) {
      if (this.matchesPattern(endpoint, rule.endpoint) && 
          (rule.method === '*' || rule.method.toUpperCase() === method.toUpperCase())) {
        applicableRules.push(rule);
      }
    }

    return applicableRules.sort((a, b) => {
      // Sort by specificity (more specific patterns first)
      const aSpecificity = this.getPatternSpecificity(a.endpoint);
      const bSpecificity = this.getPatternSpecificity(b.endpoint);
      return bSpecificity - aSpecificity;
    });
  }

  private matchesPattern(path: string, pattern: string): boolean {
    if (pattern === '*') return true;
    
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  private getPatternSpecificity(pattern: string): number {
    if (pattern === '*') return 0;
    
    // Count specific characters (not wildcards)
    const specificChars = pattern.replace(/[\*\[\]\(\)]/g, '').length;
    const wildcards = (pattern.match(/[\*\[\]\(\)]/g) || []).length;
    
    return specificChars - wildcards;
  }

  private xmlToJson(xmlString: string): any {
    try {
      // Simple XML to JSON conversion
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      return this.xmlNodeToJson(xmlDoc.documentElement);
    } catch (error) {
      return xmlString; // Return original if parsing fails
    }
  }

  private xmlNodeToJson(node: Element): any {
    const result: any = {};
    
    // Handle attributes
    if (node.attributes.length > 0) {
      result['@attributes'] = {};
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        result['@attributes'][attr.name] = attr.value;
      }
    }
    
    // Handle child nodes
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.trim();
        if (text) {
          result['#text'] = text;
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const childElement = child as Element;
        const childName = childElement.tagName;
        const childValue = this.xmlNodeToJson(childElement);
        
        if (result[childName]) {
          if (!Array.isArray(result[childName])) {
            result[childName] = [result[childName]];
          }
          result[childName].push(childValue);
        } else {
          result[childName] = childValue;
        }
      }
    }
    
    return result;
  }

  // Custom transformation functions
  addCustomTransform(
    ruleId: string,
    endpoint: string,
    method: string,
    transformFn: (data: any) => any,
    type: 'request' | 'response' = 'response',
  ): void {
    const existingRule = this.transformRules.get(ruleId);
    
    if (existingRule) {
      if (type === 'request') {
        existingRule.requestTransform = transformFn;
      } else {
        existingRule.responseTransform = transformFn;
      }
    } else {
      const newRule: TransformRule = {
        id: ruleId,
        name: `Custom ${type} transform`,
        endpoint,
        method,
        [type === 'request' ? 'requestTransform' : 'responseTransform']: transformFn,
      };
      this.addTransformRule(newRule);
    }
  }
} 