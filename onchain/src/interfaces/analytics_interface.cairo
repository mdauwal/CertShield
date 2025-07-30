use starknet::ContractAddress;

#[derive(Drop, Serde, starknet::Store)]
pub struct IssuanceRecord {
    pub certificate_id: u256,
    pub issuer: ContractAddress,
    pub recipient: ContractAddress,
    pub course_name: ByteArray,
    pub timestamp: u64,
    pub expiry_date: u64,
}

#[derive(Drop, Serde, starknet::Store)]
pub struct VerificationRecord {
    pub certificate_id: u256,
    pub verifier: ContractAddress,
    pub timestamp: u64,
    pub is_valid: bool,
    pub verification_result: ByteArray,
}

#[derive(Drop, Serde, starknet::Store)]
pub struct TimeAggregation {
    pub total_issuances: u256,
    pub total_verifications: u256,
    pub successful_verifications: u256,
    pub failed_verifications: u256,
    pub unique_issuers: u256,
    pub unique_recipients: u256,
    pub unique_verifiers: u256,
    pub avg_verification_time: u64,
}

#[derive(Drop, Serde, starknet::Store)]
pub struct InstitutionalMetrics {
    pub total_issued: u256,
    pub total_verified: u256,
    pub success_rate: u256,
    pub avg_certificate_lifetime: u64,
    pub revocation_rate: u256,
    pub last_activity: u64,
}

#[derive(Drop, Serde, starknet::Store)]
pub struct AnalyticsReport {
    pub report_id: u256,
    pub report_type: ByteArray,
    pub start_timestamp: u64,
    pub end_timestamp: u64,
    pub total_issuances: u256,
    pub total_verifications: u256,
    pub success_rate: u256,
    pub top_issuers: Array<ContractAddress>,
    pub top_recipients: Array<ContractAddress>,
    pub generated_at: u64,
}

#[starknet::interface]
pub trait ICertificateAnalytics<TContractState> {
    // Core analytics functions
    fn record_issuance(
        ref self: TContractState,
        certificate_id: u256,
        issuer: ContractAddress,
        recipient: ContractAddress,
        course_name: ByteArray,
        expiry_date: u64
    );
    
    fn record_verification(
        ref self: TContractState,
        certificate_id: u256,
        verifier: ContractAddress,
        is_valid: bool,
        verification_result: ByteArray
    );
    
    // Analytics data retrieval
    fn get_analytics_data(
        self: @TContractState,
        start_timestamp: u64,
        end_timestamp: u64
    ) -> TimeAggregation;
    
    fn generate_reports(
        ref self: TContractState,
        report_type: ByteArray,
        start_timestamp: u64,
        end_timestamp: u64
    ) -> u256;
    
    // Institutional performance metrics
    fn get_institutional_metrics(
        self: @TContractState,
        institution: ContractAddress,
        is_issuer: bool
    ) -> InstitutionalMetrics;
    
    fn get_comparative_analysis(
        self: @TContractState,
        institutions: Array<ContractAddress>,
        is_issuer: bool
    ) -> Array<InstitutionalMetrics>;
    
    // Custom analytics queries
    fn get_verification_frequency(
        self: @TContractState,
        certificate_id: u256
    ) -> u256;
    
    fn get_usage_patterns(
        self: @TContractState,
        start_timestamp: u64,
        end_timestamp: u64
    ) -> Array<u256>;
    
    // Administrative functions
    fn set_analytics_enabled(ref self: TContractState, enabled: bool);
    fn set_data_retention_days(ref self: TContractState, days: u64);
    fn get_analytics_enabled(self: @TContractState) -> bool;
    fn get_data_retention_days(self: @TContractState) -> u64;
} 