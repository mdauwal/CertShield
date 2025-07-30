import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  CertificateInput, 
  CertificateData, 
  BlockchainTransaction, 
  CertificateBlockchainData,
  BlockchainVerificationResult,
  BatchBlockchainData,
  StarknetConfig 
} from '../interfaces/blockchain.interface';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly config: StarknetConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      network: this.configService.get('STARKNET_NETWORK', 'testnet'),
      contractAddress: this.configService.get('STARKNET_CONTRACT_ADDRESS'),
      privateKey: this.configService.get('STARKNET_PRIVATE_KEY'),
      accountAddress: this.configService.get('STARKNET_ACCOUNT_ADDRESS'),
      rpcUrl: this.configService.get('STARKNET_RPC_URL'),
      chainId: this.configService.get('STARKNET_CHAIN_ID'),
    };
  }

  async issueCertificate(certificateData: CertificateInput): Promise<CertificateBlockchainData> {
    try {
      this.logger.log(`Issuing certificate on blockchain: ${JSON.stringify(certificateData)}`);

      // In a real implementation, this would interact with Starknet
      // For now, we'll simulate the blockchain interaction
      const transactionHash = this.generateTransactionHash();
      const blockNumber = await this.getCurrentBlockNumber();
      const certificateId = await this.getNextCertificateId();

      const blockchainData: CertificateBlockchainData = {
        certificateId,
        transactionHash,
        blockNumber,
        contractAddress: this.config.contractAddress,
        network: this.config.network,
        metadata: {
          courseName: certificateData.course_name,
          recipient: certificateData.recipient,
          expiryDate: certificateData.expiry_date,
          metadataUri: certificateData.metadata_uri,
        },
      };

      this.logger.log(`Certificate issued successfully: ${JSON.stringify(blockchainData)}`);
      return blockchainData;
    } catch (error) {
      this.logger.error(`Failed to issue certificate: ${error.message}`);
      throw new BadRequestException('Failed to issue certificate on blockchain');
    }
  }

  async revokeCertificate(certificateId: number): Promise<BlockchainTransaction> {
    try {
      this.logger.log(`Revoking certificate on blockchain: ${certificateId}`);

      // Simulate blockchain revocation
      const transactionHash = this.generateTransactionHash();
      const blockNumber = await this.getCurrentBlockNumber();

      const transaction: BlockchainTransaction = {
        transactionHash,
        blockNumber,
        status: 'confirmed',
        gasUsed: 50000,
        gasPrice: 1000000000,
        timestamp: Date.now(),
      };

      this.logger.log(`Certificate revoked successfully: ${JSON.stringify(transaction)}`);
      return transaction;
    } catch (error) {
      this.logger.error(`Failed to revoke certificate: ${error.message}`);
      throw new BadRequestException('Failed to revoke certificate on blockchain');
    }
  }

  async verifyCertificate(certificateId: number): Promise<BlockchainVerificationResult> {
    try {
      this.logger.log(`Verifying certificate on blockchain: ${certificateId}`);

      // Simulate blockchain verification
      const isValid = Math.random() > 0.1; // 90% success rate for demo
      
      if (!isValid) {
        return {
          isValid: false,
          error: 'Certificate not found or invalid',
          verificationDate: new Date(),
        };
      }

      const result: BlockchainVerificationResult = {
        isValid: true,
        certificateId,
        transactionHash: this.generateTransactionHash(),
        blockNumber: await this.getCurrentBlockNumber(),
        verificationDate: new Date(),
      };

      this.logger.log(`Certificate verification completed: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to verify certificate: ${error.message}`);
      return {
        isValid: false,
        error: error.message,
        verificationDate: new Date(),
      };
    }
  }

  async getCertificateData(certificateId: number): Promise<CertificateData> {
    try {
      this.logger.log(`Fetching certificate data from blockchain: ${certificateId}`);

      // Simulate fetching certificate data from blockchain
      const certificateData: CertificateData = {
        id: certificateId,
        recipient: '0x1234567890abcdef',
        issuer: this.config.accountAddress,
        course_name: 'Web Development Course',
        issue_date: Math.floor(Date.now() / 1000),
        expiry_date: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year
        is_revoked: false,
        metadata_uri: 'ipfs://QmExample',
      };

      return certificateData;
    } catch (error) {
      this.logger.error(`Failed to fetch certificate data: ${error.message}`);
      throw new BadRequestException('Failed to fetch certificate data from blockchain');
    }
  }

  async processBatchCertificates(certificates: CertificateInput[]): Promise<BatchBlockchainData> {
    try {
      this.logger.log(`Processing batch of ${certificates.length} certificates`);

      const batchId = this.generateBatchId();
      const transactions: CertificateBlockchainData[] = [];
      const errors: string[] = [];

      for (let i = 0; i < certificates.length; i++) {
        try {
          const certificateData = certificates[i];
          const blockchainData = await this.issueCertificate(certificateData);
          transactions.push(blockchainData);
        } catch (error) {
          errors.push(`Certificate ${i + 1}: ${error.message}`);
        }
      }

      const batchData: BatchBlockchainData = {
        batchId,
        transactions,
        totalProcessed: transactions.length,
        totalFailed: errors.length,
        errors,
      };

      this.logger.log(`Batch processing completed: ${JSON.stringify(batchData)}`);
      return batchData;
    } catch (error) {
      this.logger.error(`Failed to process batch certificates: ${error.message}`);
      throw new BadRequestException('Failed to process batch certificates');
    }
  }

  async getBlockchainStatus(): Promise<{ isConnected: boolean; network: string; contractAddress: string }> {
    try {
      // Simulate blockchain connection check
      return {
        isConnected: true,
        network: this.config.network,
        contractAddress: this.config.contractAddress,
      };
    } catch (error) {
      this.logger.error(`Failed to get blockchain status: ${error.message}`);
      return {
        isConnected: false,
        network: this.config.network,
        contractAddress: this.config.contractAddress,
      };
    }
  }

  private generateTransactionHash(): string {
    return '0x' + Math.random().toString(16).substring(2, 66);
  }

  private generateBatchId(): string {
    return 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  }

  private async getCurrentBlockNumber(): Promise<number> {
    // Simulate getting current block number
    return Math.floor(Date.now() / 1000);
  }

  private async getNextCertificateId(): Promise<number> {
    // Simulate getting next certificate ID
    return Math.floor(Math.random() * 1000000) + 1;
  }

  // Helper method to convert certificate data to blockchain format
  convertToBlockchainFormat(certificate: any): CertificateInput {
    return {
      recipient: certificate.recipientEmail, // In real implementation, this would be a wallet address
      course_name: certificate.title,
      expiry_date: certificate.expiryDate ? Math.floor(new Date(certificate.expiryDate).getTime() / 1000) : undefined,
      metadata_uri: certificate.metadata?.ipfsUri || undefined,
    };
  }
} 