use starknet::{ContractAddress, contract_address_const, get_block_timestamp};
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_timestamp, stop_cheat_block_timestamp};

use starkcert::{IStarkCert, IStarkCertDispatcher, IStarkCertDispatcherTrait};
use starkcert::interfaces::{Certificate, CertificateInput};

fn OWNER() -> ContractAddress {
    contract_address_const::<'owner'>()
}

fn ISSUER() -> ContractAddress {
    contract_address_const::<'issuer'>()
}

fn RECIPIENT() -> ContractAddress {
    contract_address_const::<'recipient'>()
}

fn deploy_contract() -> IStarkCertDispatcher {
    let contract = declare("StarkCert").unwrap().contract_class();
    let constructor_calldata = array![OWNER().into()];
    let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap();
    IStarkCertDispatcher { contract_address }
}

#[test]
fn test_deploy_and_initialize() {
    let contract = deploy_contract();
    
    // Test initial state
    assert(contract.get_total_certificates() == 0, 'Initial total should be 0');
    assert(contract.get_active_certificates_count() == 0, 'Initial active should be 0');
    assert(!contract.is_authorized_issuer(ISSUER()), 'Issuer should not be authorized');
}

#[test]
fn test_add_authorized_issuer() {
    let contract = deploy_contract();
    
    // Add authorized issuer as owner
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.add_authorized_issuer(ISSUER());
    stop_cheat_caller_address(contract.contract_address);
    
    assert(contract.is_authorized_issuer(ISSUER()), 'Issuer should be authorized');
}

#[test]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_add_authorized_issuer_unauthorized() {
    let contract = deploy_contract();
    
    // Try to add issuer without being owner
    start_cheat_caller_address(contract.contract_address, ISSUER());
    contract.add_authorized_issuer(ISSUER());
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
fn test_issue_certificate() {
    let contract = deploy_contract();
    
    // Add authorized issuer
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.add_authorized_issuer(ISSUER());
    stop_cheat_caller_address(contract.contract_address);
    
    // Issue certificate
    start_cheat_caller_address(contract.contract_address, ISSUER());
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    let certificate_data = CertificateInput {
        recipient: RECIPIENT(),
        course_name: "Blockchain Development",
        expiry_date: 2000,
        metadata_uri: "https://example.com/cert/1",
    };
    
    let certificate_id = contract.issue_certificate(certificate_data);
    
    stop_cheat_block_timestamp(contract.contract_address);
    stop_cheat_caller_address(contract.contract_address);
    
    // Verify certificate was issued
    assert(certificate_id == 1, 'Certificate ID should be 1');
    assert(contract.get_total_certificates() == 1, 'Total certificates should be 1');
    assert(contract.get_active_certificates_count() == 1, 'Active certificates should be 1');
    
    let certificate = contract.get_certificate(certificate_id);
    assert(certificate.id == 1, 'Certificate ID mismatch');
    assert(certificate.recipient == RECIPIENT(), 'Recipient mismatch');
    assert(certificate.issuer == ISSUER(), 'Issuer mismatch');
    assert(certificate.course_name == "Blockchain Development", 'Course name mismatch');
    assert(!certificate.is_revoked, 'Certificate should not be revoked');
}

#[test]
#[should_panic(expected: ('Unauthorized issuer',))]
fn test_issue_certificate_unauthorized() {
    let contract = deploy_contract();
    
    let certificate_data = CertificateInput {
        recipient: RECIPIENT(),
        course_name: "Blockchain Development",
        expiry_date: 2000,
        metadata_uri: "https://example.com/cert/1",
    };
    
    // Try to issue certificate without authorization
    start_cheat_caller_address(contract.contract_address, ISSUER());
    contract.issue_certificate(certificate_data);
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
fn test_verify_certificate() {
    let contract = deploy_contract();
    
    // Setup and issue certificate
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.add_authorized_issuer(ISSUER());
    stop_cheat_caller_address(contract.contract_address);
    
    start_cheat_caller_address(contract.contract_address, ISSUER());
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    let certificate_data = CertificateInput {
        recipient: RECIPIENT(),
        course_name: "Blockchain Development",
        expiry_date: 2000,
        metadata_uri: "https://example.com/cert/1",
    };
    
    let certificate_id = contract.issue_certificate(certificate_data);
    
    stop_cheat_block_timestamp(contract.contract_address);
    stop_cheat_caller_address(contract.contract_address);
    
    // Verify certificate
    assert(contract.verify_certificate(certificate_id), 'Certificate should be valid');
    
    // Test non-existent certificate
    assert(!contract.verify_certificate(999), 'Non-existent cert should be invalid');
}

#[test]
fn test_revoke_certificate() {
    let contract = deploy_contract();
    
    // Setup and issue certificate
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.add_authorized_issuer(ISSUER());
    stop_cheat_caller_address(contract.contract_address);
    
    start_cheat_caller_address(contract.contract_address, ISSUER());
    
    let certificate_data = CertificateInput {
        recipient: RECIPIENT(),
        course_name: "Blockchain Development",
        expiry_date: 2000,
        metadata_uri: "https://example.com/cert/1",
    };
    
    let certificate_id = contract.issue_certificate(certificate_data);
    
    // Revoke certificate
    contract.revoke_certificate(certificate_id);
    
    stop_cheat_caller_address(contract.contract_address);
    
    // Verify certificate is revoked
    assert(!contract.verify_certificate(certificate_id), 'Revoked cert should be invalid');
    assert(contract.get_active_certificates_count() == 0, 'Active count should be 0');
    
    let certificate = contract.get_certificate(certificate_id);
    assert(certificate.is_revoked, 'Certificate should be marked as revoked');
}

#[test]
fn test_certificate_expiry() {
    let contract = deploy_contract();
    
    // Setup
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.add_authorized_issuer(ISSUER());
    stop_cheat_caller_address(contract.contract_address);
    
    start_cheat_caller_address(contract.contract_address, ISSUER());
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    let certificate_data = CertificateInput {
        recipient: RECIPIENT(),
        course_name: "Blockchain Development",
        expiry_date: 1500, // Expires at timestamp 1500
        metadata_uri: "https://example.com/cert/1",
    };
    
    let certificate_id = contract.issue_certificate(certificate_data);
    
    // Certificate should be valid before expiry
    assert(contract.verify_certificate(certificate_id), 'Certificate should be valid');
    
    // Move time past expiry
    start_cheat_block_timestamp(contract.contract_address, 2000);
    
    // Certificate should now be invalid due to expiry
    assert(!contract.verify_certificate(certificate_id), 'Expired cert should be invalid');
    
    stop_cheat_block_timestamp(contract.contract_address);
    stop_cheat_caller_address(contract.contract_address);
}
