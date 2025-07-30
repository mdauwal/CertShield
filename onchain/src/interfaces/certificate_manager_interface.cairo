use starknet::ContractAddress;

#[derive(Drop, Serde, starknet::Store, Copy, starknet::Store)]
pub enum CertificateStatus {
    Active,
    Revoked,
    Expired,
    Suspended,
}

#[derive(Drop, Serde, starknet::Store)]
pub struct CertificateData {
    pub id: u256,
    pub issuer: ContractAddress,
    pub recipient: ContractAddress,
    pub metadata_uri: ByteArray,
    pub timestamp: u64,
    pub expiry_timestamp: u64,
    pub status: CertificateStatus,
    pub revocation_reason: ByteArray,
    pub revocation_timestamp: u64,
    pub certificate_hash: u256,
    pub version: u32,
    pub last_modified: u64,
    pub modified_by: ContractAddress,
}

#[derive(Drop, Serde)]
pub struct CertificateRequest {
    pub recipient: ContractAddress,
    pub metadata_uri: ByteArray,
    pub expiry_timestamp: u64,
    pub custom_data: ByteArray,
}

#[derive(Drop, Serde)]
pub struct BatchCertificateRequest {
    pub requests: Array<CertificateRequest>,
}

#[derive(Drop, Serde)]
pub struct CertificateUpdateRequest {
    pub certificate_id: u256,
    pub new_metadata_uri: ByteArray,
    pub new_expiry_timestamp: u64,
    pub reason: ByteArray,
}

#[starknet::interface]
pub trait ICertificateManager<TContractState> {
    // Core certificate management
    fn issue_certificate(
        ref self: TContractState,
        request: CertificateRequest
    ) -> u256;
    
    fn get_certificate(
        self: @TContractState,
        certificate_id: u256
    ) -> CertificateData;
    
    fn update_certificate_status(
        ref self: TContractState,
        certificate_id: u256,
        new_status: CertificateStatus,
        reason: ByteArray
    );
    
    fn batch_issue_certificates(
        ref self: TContractState,
        batch_request: BatchCertificateRequest
    ) -> u256;
    
    // Certificate verification and integrity
    fn verify_certificate_integrity(
        self: @TContractState,
        certificate_id: u256,
        expected_hash: u256
    ) -> bool;
    
    // IPFS metadata management
    fn store_ipfs_metadata(
        ref self: TContractState,
        ipfs_hash: ByteArray,
        metadata: ByteArray
    );
    
    fn get_ipfs_metadata(
        self: @TContractState,
        ipfs_hash: ByteArray
    ) -> ByteArray;
    
    // Certificate ownership and access control
    fn get_certificate_owner(
        self: @TContractState,
        certificate_id: u256
    ) -> ContractAddress;
    
    fn get_certificate_issuer(
        self: @TContractState,
        certificate_id: u256
    ) -> ContractAddress;
    
    fn is_certificate_owner(
        self: @TContractState,
        certificate_id: u256,
        address: ContractAddress
    ) -> bool;
    
    // Certificate status queries
    fn get_certificates_by_status(
        self: @TContractState,
        owner: ContractAddress,
        status: CertificateStatus
    ) -> Array<u256>;
    
    fn get_certificate_status(
        self: @TContractState,
        certificate_id: u256
    ) -> CertificateStatus;
    
    // Statistics and analytics
    fn get_certificate_statistics(
        self: @TContractState
    ) -> (u256, u256, u256, u256);
    
    fn get_certificate_count_by_owner(
        self: @TContractState,
        owner: ContractAddress
    ) -> u256;
    
    // Administrative functions
    fn grant_issuer_role(
        ref self: TContractState,
        address: ContractAddress
    );
    
    fn revoke_issuer_role(
        ref self: TContractState,
        address: ContractAddress
    );
    
    fn grant_revoker_role(
        ref self: TContractState,
        address: ContractAddress
    );
} 