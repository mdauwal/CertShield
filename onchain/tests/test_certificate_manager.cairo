use starknet::{ContractAddress, contract_address_const, get_block_timestamp};
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, 
    start_cheat_caller_address, stop_cheat_caller_address, 
    start_cheat_block_timestamp, stop_cheat_block_timestamp
};

use starkcert::CertificateManager;
use starkcert::CertificateManagerDispatcher;
use starkcert::CertificateManagerDispatcherTrait;
use starkcert::interfaces::{CertificateRequest, BatchCertificateRequest, CertificateStatus};

fn OWNER() -> ContractAddress {
    contract_address_const::<'owner'>()
}

fn ISSUER() -> ContractAddress {
    contract_address_const::<'issuer'>()
}

fn RECIPIENT() -> ContractAddress {
    contract_address_const::<'recipient'>()
}

fn REVOKER() -> ContractAddress {
    contract_address_const::<'revoker'>()
}

fn deploy_certificate_manager() -> CertificateManagerDispatcher {
    let contract = declare("CertificateManager").unwrap().contract_class();
    let constructor_calldata = array![OWNER().into()];
    let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap();
    CertificateManagerDispatcher { contract_address }
}

#[test]
fn test_deploy_and_initialize() {
    let contract = deploy_certificate_manager();
    
    // Test initial state
    let stats = contract.get_certificate_statistics();
    assert(stats.0 == 0, 'Total certificates should be 0');
    assert(stats.1 == 0, 'Active certificates should be 0');
    assert(stats.2 == 0, 'Revoked certificates should be 0');
    assert(stats.3 == 0, 'Expired certificates should be 0');
}

#[test]
fn test_issue_certificate() {
    let contract = deploy_certificate_manager();
    
    // Grant issuer role
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.grant_issuer_role(ISSUER());
    stop_cheat_caller_address(contract.contract_address);
    
    // Issue certificate
    start_cheat_caller_address(contract.contract_address, ISSUER());
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    let request = CertificateRequest {
        recipient: RECIPIENT(),
        metadata_uri: "ipfs://QmExample",
        expiry_timestamp: 2000,
        custom_data: "Blockchain Development Course",
    };
    
    let certificate_id = contract.issue_certificate(request);
    
    stop_cheat_block_timestamp(contract.contract_address);
    stop_cheat_caller_address(contract.contract_address);
    
    // Verify certificate was issued
    let certificate = contract.get_certificate(certificate_id);
    assert(certificate.id == certificate_id, 'Certificate ID mismatch');
    assert(certificate.issuer == ISSUER(), 'Issuer mismatch');
    assert(certificate.recipient == RECIPIENT(), 'Recipient mismatch');
    assert(certificate.metadata_uri == "ipfs://QmExample", 'Metadata URI mismatch');
    assert(certificate.status == CertificateStatus::Active, 'Status should be Active');
    
    // Check statistics
    let stats = contract.get_certificate_statistics();
    assert(stats.0 == 1, 'Total certificates should be 1');
    assert(stats.1 == 1, 'Active certificates should be 1');
}

#[test]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_issue_certificate_unauthorized() {
    let contract = deploy_certificate_manager();
    
    let request = CertificateRequest {
        recipient: RECIPIENT(),
        metadata_uri: "ipfs://QmExample",
        expiry_timestamp: 2000,
        custom_data: "Blockchain Development Course",
    };
    
    // Try to issue certificate without issuer role
    start_cheat_caller_address(contract.contract_address, ISSUER());
    contract.issue_certificate(request);
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
fn test_batch_issue_certificates() {
    let contract = deploy_certificate_manager();
    
    // Grant issuer role
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.grant_issuer_role(ISSUER());
    stop_cheat_caller_address(contract.contract_address);
    
    // Create batch request
    let requests = array![
        CertificateRequest {
            recipient: RECIPIENT(),
            metadata_uri: "ipfs://QmExample1",
            expiry_timestamp: 2000,
            custom_data: "Course 1",
        },
        CertificateRequest {
            recipient: RECIPIENT(),
            metadata_uri: "ipfs://QmExample2",
            expiry_timestamp: 3000,
            custom_data: "Course 2",
        }
    ];
    
    let batch_request = BatchCertificateRequest { requests };
    
    // Issue batch
    start_cheat_caller_address(contract.contract_address, ISSUER());
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    let batch_id = contract.batch_issue_certificates(batch_request);
    
    stop_cheat_block_timestamp(contract.contract_address);
    stop_cheat_caller_address(contract.contract_address);
    
    // Verify batch was processed
    assert(batch_id == 1, 'Batch ID should be 1');
    
    // Check statistics
    let stats = contract.get_certificate_statistics();
    assert(stats.0 == 2, 'Total certificates should be 2');
    assert(stats.1 == 2, 'Active certificates should be 2');
}

#[test]
fn test_update_certificate_status() {
    let contract = deploy_certificate_manager();
    
    // Setup: Grant roles and issue certificate
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.grant_issuer_role(ISSUER());
    contract.grant_revoker_role(REVOKER());
    stop_cheat_caller_address(contract.contract_address);
    
    start_cheat_caller_address(contract.contract_address, ISSUER());
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    let request = CertificateRequest {
        recipient: RECIPIENT(),
        metadata_uri: "ipfs://QmExample",
        expiry_timestamp: 2000,
        custom_data: "Blockchain Development Course",
    };
    
    let certificate_id = contract.issue_certificate(request);
    
    stop_cheat_block_timestamp(contract.contract_address);
    stop_cheat_caller_address(contract.contract_address);
    
    // Revoke certificate
    start_cheat_caller_address(contract.contract_address, REVOKER());
    contract.update_certificate_status(certificate_id, CertificateStatus::Revoked, "Academic misconduct");
    stop_cheat_caller_address(contract.contract_address);
    
    // Verify status change
    let certificate = contract.get_certificate(certificate_id);
    assert(certificate.status == CertificateStatus::Revoked, 'Status should be Revoked');
    assert(certificate.revocation_reason == "Academic misconduct", 'Revocation reason mismatch');
    
    // Check statistics
    let stats = contract.get_certificate_statistics();
    assert(stats.0 == 1, 'Total certificates should be 1');
    assert(stats.1 == 0, 'Active certificates should be 0');
    assert(stats.2 == 1, 'Revoked certificates should be 1');
}

#[test]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_update_certificate_status_unauthorized() {
    let contract = deploy_certificate_manager();
    
    // Try to update status without revoker role
    start_cheat_caller_address(contract.contract_address, ISSUER());
    contract.update_certificate_status(1, CertificateStatus::Revoked, "Test");
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
fn test_verify_certificate_integrity() {
    let contract = deploy_certificate_manager();
    
    // Setup: Grant issuer role and issue certificate
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.grant_issuer_role(ISSUER());
    stop_cheat_caller_address(contract.contract_address);
    
    start_cheat_caller_address(contract.contract_address, ISSUER());
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    let request = CertificateRequest {
        recipient: RECIPIENT(),
        metadata_uri: "ipfs://QmExample",
        expiry_timestamp: 2000,
        custom_data: "Blockchain Development Course",
    };
    
    let certificate_id = contract.issue_certificate(request);
    
    stop_cheat_block_timestamp(contract.contract_address);
    stop_cheat_caller_address(contract.contract_address);
    
    // Get certificate to extract hash
    let certificate = contract.get_certificate(certificate_id);
    
    // Verify integrity with correct hash
    let is_valid = contract.verify_certificate_integrity(certificate_id, certificate.certificate_hash);
    assert(is_valid, 'Certificate integrity should be valid');
    
    // Verify integrity with incorrect hash
    let is_invalid = contract.verify_certificate_integrity(certificate_id, 999);
    assert(!is_invalid, 'Certificate integrity should be invalid');
}

#[test]
fn test_ipfs_metadata_management() {
    let contract = deploy_certificate_manager();
    
    // Grant issuer role
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.grant_issuer_role(ISSUER());
    stop_cheat_caller_address(contract.contract_address);
    
    // Store IPFS metadata
    start_cheat_caller_address(contract.contract_address, ISSUER());
    contract.store_ipfs_metadata("QmExample", '{"name": "Blockchain Course", "description": "Advanced blockchain development"}');
    stop_cheat_caller_address(contract.contract_address);
    
    // Retrieve IPFS metadata
    let metadata = contract.get_ipfs_metadata("QmExample");
    assert(metadata == '{"name": "Blockchain Course", "description": "Advanced blockchain development"}', 'Metadata mismatch');
}

#[test]
fn test_certificate_ownership() {
    let contract = deploy_certificate_manager();
    
    // Setup: Grant issuer role and issue certificate
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.grant_issuer_role(ISSUER());
    stop_cheat_caller_address(contract.contract_address);
    
    start_cheat_caller_address(contract.contract_address, ISSUER());
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    let request = CertificateRequest {
        recipient: RECIPIENT(),
        metadata_uri: "ipfs://QmExample",
        expiry_timestamp: 2000,
        custom_data: "Blockchain Development Course",
    };
    
    let certificate_id = contract.issue_certificate(request);
    
    stop_cheat_block_timestamp(contract.contract_address);
    stop_cheat_caller_address(contract.contract_address);
    
    // Test ownership functions
    let owner = contract.get_certificate_owner(certificate_id);
    assert(owner == RECIPIENT(), 'Owner should be recipient');
    
    let issuer = contract.get_certificate_issuer(certificate_id);
    assert(issuer == ISSUER(), 'Issuer should be issuer');
    
    let is_owner = contract.is_certificate_owner(certificate_id, RECIPIENT());
    assert(is_owner, 'Should be certificate owner');
    
    let is_not_owner = contract.is_certificate_owner(certificate_id, ISSUER());
    assert(!is_not_owner, 'Should not be certificate owner');
}

#[test]
fn test_certificate_status_queries() {
    let contract = deploy_certificate_manager();
    
    // Setup: Grant roles and issue certificates
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.grant_issuer_role(ISSUER());
    contract.grant_revoker_role(REVOKER());
    stop_cheat_caller_address(contract.contract_address);
    
    start_cheat_caller_address(contract.contract_address, ISSUER());
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    // Issue multiple certificates
    let request1 = CertificateRequest {
        recipient: RECIPIENT(),
        metadata_uri: "ipfs://QmExample1",
        expiry_timestamp: 2000,
        custom_data: "Course 1",
    };
    
    let request2 = CertificateRequest {
        recipient: RECIPIENT(),
        metadata_uri: "ipfs://QmExample2",
        expiry_timestamp: 3000,
        custom_data: "Course 2",
    };
    
    let certificate_id1 = contract.issue_certificate(request1);
    let certificate_id2 = contract.issue_certificate(request2);
    
    stop_cheat_block_timestamp(contract.contract_address);
    stop_cheat_caller_address(contract.contract_address);
    
    // Revoke one certificate
    start_cheat_caller_address(contract.contract_address, REVOKER());
    contract.update_certificate_status(certificate_id1, CertificateStatus::Revoked, "Test revocation");
    stop_cheat_caller_address(contract.contract_address);
    
    // Test status queries
    let active_certificates = contract.get_certificates_by_status(RECIPIENT(), CertificateStatus::Active);
    assert(active_certificates.len() == 1, 'Should have 1 active certificate');
    
    let revoked_certificates = contract.get_certificates_by_status(RECIPIENT(), CertificateStatus::Revoked);
    assert(revoked_certificates.len() == 1, 'Should have 1 revoked certificate');
    
    let status1 = contract.get_certificate_status(certificate_id1);
    assert(status1 == CertificateStatus::Revoked, 'Certificate 1 should be revoked');
    
    let status2 = contract.get_certificate_status(certificate_id2);
    assert(status2 == CertificateStatus::Active, 'Certificate 2 should be active');
}

#[test]
fn test_certificate_statistics() {
    let contract = deploy_certificate_manager();
    
    // Setup: Grant issuer role
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.grant_issuer_role(ISSUER());
    stop_cheat_caller_address(contract.contract_address);
    
    start_cheat_caller_address(contract.contract_address, ISSUER());
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    // Issue certificates
    let request = CertificateRequest {
        recipient: RECIPIENT(),
        metadata_uri: "ipfs://QmExample",
        expiry_timestamp: 2000,
        custom_data: "Blockchain Development Course",
    };
    
    contract.issue_certificate(request);
    
    stop_cheat_block_timestamp(contract.contract_address);
    stop_cheat_caller_address(contract.contract_address);
    
    // Test statistics
    let stats = contract.get_certificate_statistics();
    assert(stats.0 == 1, 'Total certificates should be 1');
    assert(stats.1 == 1, 'Active certificates should be 1');
    
    let count = contract.get_certificate_count_by_owner(RECIPIENT());
    assert(count == 1, 'Owner should have 1 certificate');
}

#[test]
fn test_role_management() {
    let contract = deploy_certificate_manager();
    
    // Test granting and revoking roles
    start_cheat_caller_address(contract.contract_address, OWNER());
    
    contract.grant_issuer_role(ISSUER());
    contract.grant_revoker_role(REVOKER());
    
    // Test revoking issuer role
    contract.revoke_issuer_role(ISSUER());
    
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_role_management_unauthorized() {
    let contract = deploy_certificate_manager();
    
    // Try to grant role without admin privileges
    start_cheat_caller_address(contract.contract_address, ISSUER());
    contract.grant_issuer_role(RECIPIENT());
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
fn test_certificate_hash_generation() {
    let contract = deploy_certificate_manager();
    
    // Setup: Grant issuer role
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.grant_issuer_role(ISSUER());
    stop_cheat_caller_address(contract.contract_address);
    
    start_cheat_caller_address(contract.contract_address, ISSUER());
    start_cheat_block_timestamp(contract.contract_address, 1000);
    
    // Issue certificates with different custom data
    let request1 = CertificateRequest {
        recipient: RECIPIENT(),
        metadata_uri: "ipfs://QmExample1",
        expiry_timestamp: 2000,
        custom_data: "Course 1",
    };
    
    let request2 = CertificateRequest {
        recipient: RECIPIENT(),
        metadata_uri: "ipfs://QmExample2",
        expiry_timestamp: 2000,
        custom_data: "Course 2",
    };
    
    let certificate_id1 = contract.issue_certificate(request1);
    let certificate_id2 = contract.issue_certificate(request2);
    
    stop_cheat_block_timestamp(contract.contract_address);
    stop_cheat_caller_address(contract.contract_address);
    
    // Verify unique certificate IDs
    assert(certificate_id1 != certificate_id2, 'Certificate IDs should be unique');
    
    // Verify certificate hashes are different
    let certificate1 = contract.get_certificate(certificate_id1);
    let certificate2 = contract.get_certificate(certificate_id2);
    assert(certificate1.certificate_hash != certificate2.certificate_hash, 'Certificate hashes should be different');
} 