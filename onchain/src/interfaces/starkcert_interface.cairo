use starknet::ContractAddress;

#[derive(Drop, Serde, starknet::Store)]
pub struct Certificate {
    pub id: u256,
    pub recipient: ContractAddress,
    pub issuer: ContractAddress,
    pub course_name: ByteArray,
    pub issue_date: u64,
    pub expiry_date: u64,
    pub is_revoked: bool,
    pub metadata_uri: ByteArray,
}

#[derive(Drop, Serde)]
pub struct CertificateInput {
    pub recipient: ContractAddress,
    pub course_name: ByteArray,
    pub expiry_date: u64,
    pub metadata_uri: ByteArray,
}

#[starknet::interface]
pub trait IStarkCert<TContractState> {
    // Certificate Management
    fn issue_certificate(ref self: TContractState, certificate_data: CertificateInput) -> u256;
    fn revoke_certificate(ref self: TContractState, certificate_id: u256);
    fn verify_certificate(self: @TContractState, certificate_id: u256) -> bool;
    
    // Certificate Queries
    fn get_certificate(self: @TContractState, certificate_id: u256) -> Certificate;
    fn get_certificates_by_recipient(self: @TContractState, recipient: ContractAddress) -> Array<u256>;
    fn get_certificates_by_issuer(self: @TContractState, issuer: ContractAddress) -> Array<u256>;
    
    // Issuer Management
    fn add_authorized_issuer(ref self: TContractState, issuer: ContractAddress);
    fn remove_authorized_issuer(ref self: TContractState, issuer: ContractAddress);
    fn is_authorized_issuer(self: @TContractState, issuer: ContractAddress) -> bool;
    
    // Statistics
    fn get_total_certificates(self: @TContractState) -> u256;
    fn get_active_certificates_count(self: @TContractState) -> u256;
}
