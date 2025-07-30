export interface CertificateInput {
  recipient: string;
  course_name: string;
  expiry_date?: number;
  metadata_uri?: string;
}

export interface CertificateData {
  id: number;
  recipient: string;
  issuer: string;
  course_name: string;
  issue_date: number;
  expiry_date?: number;
  is_revoked: boolean;
  metadata_uri?: string;
}

export interface BlockchainTransaction {
  transactionHash: string;
  blockNumber: number;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: number;
  gasPrice?: number;
  timestamp: number;
}

export interface CertificateBlockchainData {
  certificateId: number;
  transactionHash: string;
  blockNumber: number;
  contractAddress: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  metadata: Record<string, any>;
}

export interface BlockchainVerificationResult {
  isValid: boolean;
  certificateId?: number;
  transactionHash?: string;
  blockNumber?: number;
  error?: string;
  verificationDate: Date;
}

export interface BatchBlockchainData {
  batchId: string;
  transactions: CertificateBlockchainData[];
  totalProcessed: number;
  totalFailed: number;
  errors: string[];
}

export interface StarknetConfig {
  network: 'mainnet' | 'testnet' | 'devnet';
  contractAddress: string;
  privateKey: string;
  accountAddress: string;
  rpcUrl: string;
  chainId: string;
}

export interface CertificateVerificationData {
  certificateId: string;
  serialNumber: string;
  blockchainHash: string;
  verificationUrl: string;
  qrCodeData: string;
  verificationTimestamp: Date;
} 