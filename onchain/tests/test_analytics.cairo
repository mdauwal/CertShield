use starknet::{ContractAddress, contract_address_const, get_block_timestamp};
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, 
    start_cheat_caller_address, stop_cheat_caller_address, 
    start_cheat_block_timestamp, stop_cheat_block_timestamp
};

use starkcert::CertificateAnalytics;
use starkcert::CertificateAnalyticsDispatcher;
use starkcert::CertificateAnalyticsDispatcherTrait;

fn OWNER() -> ContractAddress {
    contract_address_const::<'owner'>()
}

fn ISSUER() -> ContractAddress {
    contract_address_const::<'issuer'>()
}

fn RECIPIENT() -> ContractAddress {
    contract_address_const::<'recipient'>()
}

fn VERIFIER() -> ContractAddress {
    contract_address_const::<'verifier'>()
}

fn deploy_analytics_contract() -> CertificateAnalyticsDispatcher {
    let contract = declare("CertificateAnalytics").unwrap().contract_class();
    let constructor_calldata = array![OWNER().into()];
    let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap();
    CertificateAnalyticsDispatcher { contract_address }
}

#[test]
fn test_deploy_and_initialize() {
    let contract = deploy_analytics_contract();
    
    // Test initial state
    assert(contract.get_analytics_enabled(), 'Analytics should be enabled');
    assert(contract.get_data_retention_days() == 365, 'Retention should be 365 days');
}

#[test]
fn test_record_issuance() {
    let contract = deploy_analytics_contract();
    
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    contract.record_issuance(
        1, // certificate_id
        ISSUER(),
        RECIPIENT(),
        "Blockchain Development",
        2000 // expiry_date
    );
    
    stop_cheat_block_timestamp(contract.contract_address);
    
    // Test analytics data
    let analytics = contract.get_analytics_data(1000, 2000);
    assert(analytics.total_issuances == 1, 'Should have 1 issuance');
    assert(analytics.unique_issuers == 1, 'Should have 1 unique issuer');
    assert(analytics.unique_recipients == 1, 'Should have 1 unique recipient');
}

#[test]
fn test_record_verification() {
    let contract = deploy_analytics_contract();
    
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    contract.record_verification(
        1, // certificate_id
        VERIFIER(),
        true, // is_valid
        "valid" // verification_result
    );
    
    stop_cheat_block_timestamp(contract.contract_address);
    
    // Test analytics data
    let analytics = contract.get_analytics_data(1000, 2000);
    assert(analytics.total_verifications == 1, 'Should have 1 verification');
    assert(analytics.successful_verifications == 1, 'Should have 1 successful verification');
    assert(analytics.unique_verifiers == 1, 'Should have 1 unique verifier');
}

#[test]
fn test_generate_reports() {
    let contract = deploy_analytics_contract();
    
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    // Record some data
    contract.record_issuance(1, ISSUER(), RECIPIENT(), "Course 1", 2000);
    contract.record_verification(1, VERIFIER(), true, "valid");
    contract.record_verification(1, VERIFIER(), false, "expired");
    
    stop_cheat_block_timestamp(contract.contract_address);
    
    // Generate report
    let report_id = contract.generate_reports("daily", 1000, 2000);
    
    assert(report_id == 1, 'Report ID should be 1');
}

#[test]
fn test_verification_frequency() {
    let contract = deploy_analytics_contract();
    
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    // Record multiple verifications for same certificate
    contract.record_verification(1, VERIFIER(), true, "valid");
    contract.record_verification(1, VERIFIER(), true, "valid");
    contract.record_verification(1, VERIFIER(), false, "expired");
    
    stop_cheat_block_timestamp(contract.contract_address);
    
    let frequency = contract.get_verification_frequency(1);
    assert(frequency == 3, 'Should have 3 verifications for certificate 1');
}

#[test]
fn test_usage_patterns() {
    let contract = deploy_analytics_contract();
    
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    // Record verifications across different hours
    contract.record_verification(1, VERIFIER(), true, "valid");
    contract.record_verification(2, VERIFIER(), true, "valid");
    
    stop_cheat_block_timestamp(contract.contract_address);
    
    let patterns = contract.get_usage_patterns(1000, 2000);
    assert(patterns.len() == 24, 'Should have 24 hours of patterns');
}

#[test]
fn test_institutional_metrics() {
    let contract = deploy_analytics_contract();
    
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    // Record issuances for different institutions
    contract.record_issuance(1, ISSUER(), RECIPIENT(), "Course 1", 2000);
    contract.record_issuance(2, ISSUER(), RECIPIENT(), "Course 2", 2000);
    
    stop_cheat_block_timestamp(contract.contract_address);
    
    let issuer_metrics = contract.get_institutional_metrics(ISSUER(), true);
    assert(issuer_metrics.total_issued == 2, 'Issuer should have 2 total issued');
}

#[test]
fn test_comparative_analysis() {
    let contract = deploy_analytics_contract();
    
    let institutions = array![ISSUER(), RECIPIENT()];
    let analysis = contract.get_comparative_analysis(institutions, true);
    
    assert(analysis.len() == 2, 'Should have 2 institutions in analysis');
}

#[test]
fn test_analytics_enabled_control() {
    let contract = deploy_analytics_contract();
    
    // Disable analytics
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.set_analytics_enabled(false);
    stop_cheat_caller_address(contract.contract_address);
    
    assert(!contract.get_analytics_enabled(), 'Analytics should be disabled');
    
    // Re-enable analytics
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.set_analytics_enabled(true);
    stop_cheat_caller_address(contract.contract_address);
    
    assert(contract.get_analytics_enabled(), 'Analytics should be enabled');
}

#[test]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_set_analytics_enabled_unauthorized() {
    let contract = deploy_analytics_contract();
    
    // Try to disable analytics without being owner
    start_cheat_caller_address(contract.contract_address, ISSUER());
    contract.set_analytics_enabled(false);
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
fn test_data_retention_control() {
    let contract = deploy_analytics_contract();
    
    // Change retention period
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.set_data_retention_days(180);
    stop_cheat_caller_address(contract.contract_address);
    
    assert(contract.get_data_retention_days() == 180, 'Retention should be 180 days');
}

#[test]
#[should_panic(expected: ('Analytics disabled',))]
fn test_record_issuance_when_disabled() {
    let contract = deploy_analytics_contract();
    
    // Disable analytics
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.set_analytics_enabled(false);
    stop_cheat_caller_address(contract.contract_address);
    
    // Try to record issuance
    start_cheat_block_timestamp(contract.contract_address, 1000);
    contract.record_issuance(1, ISSUER(), RECIPIENT(), "Course", 2000);
    stop_cheat_block_timestamp(contract.contract_address);
}

#[test]
#[should_panic(expected: ('Analytics disabled',))]
fn test_record_verification_when_disabled() {
    let contract = deploy_analytics_contract();
    
    // Disable analytics
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.set_analytics_enabled(false);
    stop_cheat_caller_address(contract.contract_address);
    
    // Try to record verification
    start_cheat_block_timestamp(contract.contract_address, 1000);
    contract.record_verification(1, VERIFIER(), true, "valid");
    stop_cheat_block_timestamp(contract.contract_address);
}

#[test]
fn test_time_based_aggregations() {
    let contract = deploy_analytics_contract();
    
    // Record data across different time periods
    start_cheat_block_timestamp(contract.contract_address, 1000);
    contract.record_issuance(1, ISSUER(), RECIPIENT(), "Course 1", 2000);
    contract.record_verification(1, VERIFIER(), true, "valid");
    
    start_cheat_block_timestamp(contract.contract_address, 2000);
    contract.record_issuance(2, ISSUER(), RECIPIENT(), "Course 2", 3000);
    contract.record_verification(2, VERIFIER(), false, "expired");
    
    stop_cheat_block_timestamp(contract.contract_address);
    
    // Test analytics for specific time range
    let analytics = contract.get_analytics_data(1000, 1500);
    assert(analytics.total_issuances == 1, 'Should have 1 issuance in time range');
    assert(analytics.total_verifications == 1, 'Should have 1 verification in time range');
    
    let analytics_full = contract.get_analytics_data(1000, 3000);
    assert(analytics_full.total_issuances == 2, 'Should have 2 issuances in full range');
    assert(analytics_full.total_verifications == 2, 'Should have 2 verifications in full range');
    assert(analytics_full.successful_verifications == 1, 'Should have 1 successful verification');
    assert(analytics_full.failed_verifications == 1, 'Should have 1 failed verification');
} 