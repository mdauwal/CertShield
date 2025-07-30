import { Injectable } from '@nestjs/common';

interface VersionConfig {
  version: string;
  deprecated: boolean;
  sunsetDate?: Date;
  migrationGuide?: string;
  breakingChanges: string[];
  newFeatures: string[];
}

interface VersionMapping {
  [version: string]: {
    endpoint: string;
    handler: string;
    deprecated?: boolean;
  };
}

@Injectable()
export class VersioningService {
  private versionConfigs: Map<string, VersionConfig> = new Map();
  private versionMappings: Map<string, VersionMapping> = new Map();
  private defaultVersion = 'v1';

  constructor() {
    this.initializeDefaultVersions();
  }

  private initializeDefaultVersions(): void {
    // Set up default version configurations
    this.setVersionConfig('v1', {
      version: 'v1',
      deprecated: false,
      breakingChanges: [],
      newFeatures: ['Initial API version'],
    });

    this.setVersionConfig('v2', {
      version: 'v2',
      deprecated: false,
      breakingChanges: ['Changed response format', 'Updated authentication'],
      newFeatures: ['Enhanced analytics', 'Rate limiting', 'Webhooks'],
    });
  }

  setVersionConfig(version: string, config: VersionConfig): void {
    this.versionConfigs.set(version, config);
  }

  getVersionConfig(version: string): VersionConfig | undefined {
    return this.versionConfigs.get(version);
  }

  getAllVersionConfigs(): VersionConfig[] {
    return Array.from(this.versionConfigs.values());
  }

  setVersionMapping(endpoint: string, mappings: VersionMapping): void {
    this.versionMappings.set(endpoint, mappings);
  }

  getVersionMapping(endpoint: string): VersionMapping | undefined {
    return this.versionMappings.get(endpoint);
  }

  resolveVersion(requestedVersion: string, endpoint: string): string {
    const mapping = this.getVersionMapping(endpoint);
    
    if (!mapping) {
      return this.defaultVersion;
    }

    // Check if requested version exists
    if (mapping[requestedVersion]) {
      return requestedVersion;
    }

    // Find the latest non-deprecated version
    const versions = Object.keys(mapping).sort().reverse();
    for (const version of versions) {
      if (!mapping[version].deprecated) {
        return version;
      }
    }

    return this.defaultVersion;
  }

  isVersionDeprecated(version: string): boolean {
    const config = this.getVersionConfig(version);
    return config?.deprecated || false;
  }

  isVersionSunset(version: string): boolean {
    const config = this.getVersionConfig(version);
    if (!config?.sunsetDate) return false;
    return new Date() > config.sunsetDate;
  }

  getMigrationGuide(fromVersion: string, toVersion: string): string | null {
    const fromConfig = this.getVersionConfig(fromVersion);
    const toConfig = this.getVersionConfig(toVersion);

    if (!fromConfig || !toConfig) return null;

    return toConfig.migrationGuide || null;
  }

  getBreakingChanges(fromVersion: string, toVersion: string): string[] {
    const fromConfig = this.getVersionConfig(fromVersion);
    const toConfig = this.getVersionConfig(toVersion);

    if (!fromConfig || !toConfig) return [];

    // Get all breaking changes between versions
    const breakingChanges: string[] = [];
    
    // This is a simplified implementation
    // In a real scenario, you'd track breaking changes more granularly
    if (fromVersion !== toVersion) {
      breakingChanges.push(...toConfig.breakingChanges);
    }

    return breakingChanges;
  }

  transformRequestForVersion(
    version: string,
    endpoint: string,
    data: any,
  ): any {
    const config = this.getVersionConfig(version);
    if (!config) return data;

    // Apply version-specific transformations
    switch (version) {
      case 'v1':
        return this.transformForV1(data, endpoint);
      case 'v2':
        return this.transformForV2(data, endpoint);
      default:
        return data;
    }
  }

  transformResponseForVersion(
    version: string,
    endpoint: string,
    data: any,
  ): any {
    const config = this.getVersionConfig(version);
    if (!config) return data;

    // Apply version-specific transformations
    switch (version) {
      case 'v1':
        return this.transformResponseForV1(data, endpoint);
      case 'v2':
        return this.transformResponseForV2(data, endpoint);
      default:
        return data;
    }
  }

  private transformForV1(data: any, endpoint: string): any {
    // V1 specific request transformations
    if (endpoint.includes('/certificates')) {
      // V1 had different field names
      if (data && typeof data === 'object') {
        const transformed = { ...data };
        if (transformed.certificateData) {
          transformed.data = transformed.certificateData;
          delete transformed.certificateData;
        }
        return transformed;
      }
    }
    return data;
  }

  private transformForV2(data: any, endpoint: string): any {
    // V2 specific request transformations
    if (endpoint.includes('/certificates')) {
      // V2 has enhanced validation and structure
      if (data && typeof data === 'object') {
        const transformed = { ...data };
        // Add V2 specific fields
        transformed.version = 'v2';
        transformed.timestamp = new Date().toISOString();
        return transformed;
      }
    }
    return data;
  }

  private transformResponseForV1(data: any, endpoint: string): any {
    // V1 specific response transformations
    if (endpoint.includes('/certificates')) {
      if (data && typeof data === 'object') {
        const transformed = { ...data };
        // V1 had simpler response structure
        if (transformed.metadata) {
          delete transformed.metadata;
        }
        if (transformed.analytics) {
          delete transformed.analytics;
        }
        return transformed;
      }
    }
    return data;
  }

  private transformResponseForV2(data: any, endpoint: string): any {
    // V2 specific response transformations
    if (endpoint.includes('/certificates')) {
      if (data && typeof data === 'object') {
        const transformed = { ...data };
        // V2 includes enhanced metadata
        transformed.version = 'v2';
        transformed.timestamp = new Date().toISOString();
        return transformed;
      }
    }
    return data;
  }

  getVersionHeaders(version: string): Record<string, string> {
    const config = this.getVersionConfig(version);
    const headers: Record<string, string> = {
      'X-API-Version': version,
    };

    if (config?.deprecated) {
      headers['X-API-Deprecated'] = 'true';
      if (config.sunsetDate) {
        headers['X-API-Sunset-Date'] = config.sunsetDate.toISOString();
      }
    }

    return headers;
  }

  getSupportedVersions(): string[] {
    return Array.from(this.versionConfigs.keys()).sort();
  }

  getLatestVersion(): string {
    const versions = this.getSupportedVersions();
    return versions[versions.length - 1] || this.defaultVersion;
  }

  addCustomVersionTransform(
    version: string,
    endpoint: string,
    transformFn: (data: any) => any,
    type: 'request' | 'response',
  ): void {
    // This would be implemented to add custom transformations
    // for specific version/endpoint combinations
    console.log(`Adding custom ${type} transform for ${version}:${endpoint}`);
  }
} 