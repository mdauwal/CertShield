#[starknet::contract]
pub mod CertificateManager {
    use core::num::traits::Zero;
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Map
    };
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::upgrades::UpgradeableComponent;
    use openzeppelin::upgrades::interface::IUpgradeable;
    use openzeppelin::access::accesscontrol::AccessControlComponent;
    use openzeppelin::access::accesscontrol::interface::IAccessControl;
    
    use super::super::super::interfaces::{Certificate, CertificateInput, ICertificateManager};

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);
    component!(path: AccessControlComponent, storage: accesscontrol, event: AccessControlEvent);

    // Ownable Mixin
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    // Upgradeable
    impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;

    // AccessControl
    #[abi(embed_v0)]
    impl AccessControlImpl = AccessControlComponent::AccessControlImpl<ContractState>;
    impl AccessControlInternalImpl = AccessControlComponent::InternalImpl<ContractState>;

    // Certificate status enum
    #[derive(Drop, Serde, starknet::Store, Copy, starknet::Store)]
    pub enum CertificateStatus {
        Active,
        Revoked,
        Expired,
        Suspended,
    }

    // Enhanced certificate data structure
    #[derive(Drop, Serde, starknet::Store)]
    pub struct CertificateData {
        pub id: u256,
        pub issuer: ContractAddress,
        pub recipient: ContractAddress,
        pub metadata_uri: ByteArray, // IPFS hash for extended data
        pub timestamp: u64,
        pub expiry_timestamp: u64,
        pub status: CertificateStatus,
        pub revocation_reason: ByteArray,
        pub revocation_timestamp: u64,
        pub certificate_hash: u256, // Cryptographic hash for integrity
        pub version: u32,
        pub last_modified: u64,
        pub modified_by: ContractAddress,
    }

    // Certificate issuance request
    #[derive(Drop, Serde)]
    pub struct CertificateRequest {
        pub recipient: ContractAddress,
        pub metadata_uri: ByteArray,
        pub expiry_timestamp: u64,
        pub custom_data: ByteArray, // Additional data for hash generation
    }

    // Batch issuance request
    #[derive(Drop, Serde)]
    pub struct BatchCertificateRequest {
        pub requests: Array<CertificateRequest>,
    }

    // Certificate update request
    #[derive(Drop, Serde)]
    pub struct CertificateUpdateRequest {
        pub certificate_id: u256,
        pub new_metadata_uri: ByteArray,
        pub new_expiry_timestamp: u64,
        pub reason: ByteArray,
    }

    // Access control roles
    const ISSUER_ROLE: felt252 = 'ISSUER_ROLE';
    const ADMIN_ROLE: felt252 = 'ADMIN_ROLE';
    const REVOKER_ROLE: felt252 = 'REVOKER_ROLE';
    const VIEWER_ROLE: felt252 = 'VIEWER_ROLE';

    #[storage]
    struct Storage {
        // Certificate storage
        certificates: Map<u256, CertificateData>,
        certificate_counter: u256,
        
        // Certificate ownership and access
        certificate_owners: Map<u256, ContractAddress>,
        certificate_issuers: Map<u256, ContractAddress>,
        
        // Certificate metadata and IPFS
        certificate_metadata: Map<u256, ByteArray>,
        ipfs_metadata_cache: Map<ByteArray, ByteArray>,
        
        // Batch operations
        batch_operations: Map<u256, Array<u256>>,
        batch_counter: u256,
        
        // Certificate status tracking
        active_certificates: Map<ContractAddress, Array<u256>>,
        revoked_certificates: Map<ContractAddress, Array<u256>>,
        expired_certificates: Map<ContractAddress, Array<u256>>,
        
        // Certificate hash verification
        certificate_hashes: Map<u256, u256>,
        hash_to_certificate: Map<u256, u256>,
        
        // Statistics
        total_certificates: u256,
        total_active: u256,
        total_revoked: u256,
        total_expired: u256,
        
        // Components
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        upgradeable: UpgradeableComponent::Storage,
        #[substorage(v0)]
        accesscontrol: AccessControlComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        CertificateIssued: CertificateIssued,
        CertificateUpdated: CertificateUpdated,
        CertificateRevoked: CertificateRevoked,
        CertificateStatusChanged: CertificateStatusChanged,
        BatchCertificatesIssued: BatchCertificatesIssued,
        CertificateHashVerified: CertificateHashVerified,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event,
        #[flat]
        AccessControlEvent: AccessControlComponent::Event,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CertificateIssued {
        #[key]
        pub certificate_id: u256,
        #[key]
        pub issuer: ContractAddress,
        #[key]
        pub recipient: ContractAddress,
        pub metadata_uri: ByteArray,
        pub certificate_hash: u256,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CertificateUpdated {
        #[key]
        pub certificate_id: u256,
        pub new_metadata_uri: ByteArray,
        pub modified_by: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CertificateRevoked {
        #[key]
        pub certificate_id: u256,
        pub revoked_by: ContractAddress,
        pub reason: ByteArray,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CertificateStatusChanged {
        #[key]
        pub certificate_id: u256,
        pub old_status: CertificateStatus,
        pub new_status: CertificateStatus,
        pub changed_by: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BatchCertificatesIssued {
        #[key]
        pub batch_id: u256,
        pub issuer: ContractAddress,
        pub certificate_count: u256,
        pub certificate_ids: Array<u256>,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CertificateHashVerified {
        #[key]
        pub certificate_id: u256,
        pub hash: u256,
        pub is_valid: bool,
        pub verified_by: ContractAddress,
        pub timestamp: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.ownable.initializer(owner);
        self.accesscontrol.initializer(owner);
        
        // Setup default roles
        self.accesscontrol.grant_role(ADMIN_ROLE, owner);
        self.accesscontrol.grant_role(ISSUER_ROLE, owner);
        self.accesscontrol.grant_role(REVOKER_ROLE, owner);
        self.accesscontrol.grant_role(VIEWER_ROLE, owner);
        
        // Initialize counters
        self.certificate_counter.write(0);
        self.batch_counter.write(0);
        self.total_certificates.write(0);
        self.total_active.write(0);
        self.total_revoked.write(0);
        self.total_expired.write(0);
    }

    #[abi(embed_v0)]
    impl UpgradeableImpl of IUpgradeable<ContractState> {
        fn upgrade(ref self: ContractState, new_class_hash: starknet::ClassHash) {
            self.accesscontrol.assert_only_role(ADMIN_ROLE);
            self.upgradeable.upgrade(new_class_hash);
        }
    }

    #[abi(embed_v0)]
    impl CertificateManagerImpl of ICertificateManager<ContractState> {
        fn issue_certificate(
            ref self: ContractState,
            request: CertificateRequest
        ) -> u256 {
            self.issue_certificate(request)
        }

        fn get_certificate(
            self: @ContractState,
            certificate_id: u256
        ) -> CertificateData {
            self.get_certificate(certificate_id)
        }

        fn update_certificate_status(
            ref self: ContractState,
            certificate_id: u256,
            new_status: CertificateStatus,
            reason: ByteArray
        ) {
            self.update_certificate_status(certificate_id, new_status, reason);
        }

        fn batch_issue_certificates(
            ref self: ContractState,
            batch_request: BatchCertificateRequest
        ) -> u256 {
            self.batch_issue_certificates(batch_request)
        }

        fn verify_certificate_integrity(
            self: @ContractState,
            certificate_id: u256,
            expected_hash: u256
        ) -> bool {
            self.verify_certificate_integrity(certificate_id, expected_hash)
        }

        fn store_ipfs_metadata(
            ref self: ContractState,
            ipfs_hash: ByteArray,
            metadata: ByteArray
        ) {
            self.store_ipfs_metadata(ipfs_hash, metadata);
        }

        fn get_ipfs_metadata(
            self: @ContractState,
            ipfs_hash: ByteArray
        ) -> ByteArray {
            self.get_ipfs_metadata(ipfs_hash)
        }

        fn get_certificate_owner(
            self: @ContractState,
            certificate_id: u256
        ) -> ContractAddress {
            self.get_certificate_owner(certificate_id)
        }

        fn get_certificate_issuer(
            self: @ContractState,
            certificate_id: u256
        ) -> ContractAddress {
            self.get_certificate_issuer(certificate_id)
        }

        fn is_certificate_owner(
            self: @ContractState,
            certificate_id: u256,
            address: ContractAddress
        ) -> bool {
            self.is_certificate_owner(certificate_id, address)
        }

        fn get_certificates_by_status(
            self: @ContractState,
            owner: ContractAddress,
            status: CertificateStatus
        ) -> Array<u256> {
            self.get_certificates_by_status(owner, status)
        }

        fn get_certificate_status(
            self: @ContractState,
            certificate_id: u256
        ) -> CertificateStatus {
            self.get_certificate_status(certificate_id)
        }

        fn get_certificate_statistics(
            self: @ContractState
        ) -> (u256, u256, u256, u256) {
            self.get_certificate_statistics()
        }

        fn get_certificate_count_by_owner(
            self: @ContractState,
            owner: ContractAddress
        ) -> u256 {
            self.get_certificate_count_by_owner(owner)
        }

        fn grant_issuer_role(
            ref self: ContractState,
            address: ContractAddress
        ) {
            self.grant_issuer_role(address);
        }

        fn revoke_issuer_role(
            ref self: ContractState,
            address: ContractAddress
        ) {
            self.revoke_issuer_role(address);
        }

        fn grant_revoker_role(
            ref self: ContractState,
            address: ContractAddress
        ) {
            self.grant_revoker_role(address);
        }
    }

    // Core certificate management functions
    #[external(v0)]
    fn issue_certificate(
        ref self: ContractState,
        request: CertificateRequest
    ) -> u256 {
        self.accesscontrol.assert_only_role(ISSUER_ROLE);
        
        let caller = get_caller_address();
        let certificate_id = self.generate_unique_certificate_id(caller, request.recipient, request.custom_data);
        
        // Generate certificate hash for integrity
        let certificate_hash = self.generate_certificate_hash(
            certificate_id,
            caller,
            request.recipient,
            request.metadata_uri,
            request.custom_data
        );
        
        let certificate_data = CertificateData {
            id: certificate_id,
            issuer: caller,
            recipient: request.recipient,
            metadata_uri: request.metadata_uri.clone(),
            timestamp: get_block_timestamp(),
            expiry_timestamp: request.expiry_timestamp,
            status: CertificateStatus::Active,
            revocation_reason: "",
            revocation_timestamp: 0,
            certificate_hash,
            version: 1,
            last_modified: get_block_timestamp(),
            modified_by: caller,
        };
        
        // Store certificate
        self.certificates.entry(certificate_id).write(certificate_data);
        
        // Update ownership mappings
        self.certificate_owners.entry(certificate_id).write(request.recipient);
        self.certificate_issuers.entry(certificate_id).write(caller);
        
        // Store metadata
        self.certificate_metadata.entry(certificate_id).write(request.metadata_uri);
        
        // Update statistics
        self.update_certificate_statistics(certificate_id, CertificateStatus::Active, true);
        
        // Update certificate lists
        self.add_certificate_to_status_list(request.recipient, certificate_id, CertificateStatus::Active);
        
        // Store hash mapping
        self.certificate_hashes.entry(certificate_id).write(certificate_hash);
        self.hash_to_certificate.entry(certificate_hash).write(certificate_id);
        
        self.emit(CertificateIssued {
            certificate_id,
            issuer: caller,
            recipient: request.recipient,
            metadata_uri: request.metadata_uri,
            certificate_hash,
            timestamp: get_block_timestamp(),
        });
        
        certificate_id
    }

    #[external(v0)]
    fn get_certificate(self: @ContractState, certificate_id: u256) -> CertificateData {
        let certificate = self.certificates.entry(certificate_id).read();
        assert(certificate.id != 0, 'Certificate does not exist');
        certificate
    }

    #[external(v0)]
    fn update_certificate_status(
        ref self: ContractState,
        certificate_id: u256,
        new_status: CertificateStatus,
        reason: ByteArray
    ) {
        self.accesscontrol.assert_only_role(REVOKER_ROLE);
        
        let mut certificate = self.certificates.entry(certificate_id).read();
        assert(certificate.id != 0, 'Certificate does not exist');
        
        let old_status = certificate.status;
        let caller = get_caller_address();
        
        certificate.status = new_status;
        certificate.last_modified = get_block_timestamp();
        certificate.modified_by = caller;
        
        if new_status == CertificateStatus::Revoked {
            certificate.revocation_reason = reason;
            certificate.revocation_timestamp = get_block_timestamp();
        };
        
        self.certificates.entry(certificate_id).write(certificate);
        
        // Update statistics
        self.update_certificate_statistics(certificate_id, old_status, false);
        self.update_certificate_statistics(certificate_id, new_status, true);
        
        // Update certificate lists
        self.remove_certificate_from_status_list(certificate.recipient, certificate_id, old_status);
        self.add_certificate_to_status_list(certificate.recipient, certificate_id, new_status);
        
        self.emit(CertificateStatusChanged {
            certificate_id,
            old_status,
            new_status,
            changed_by: caller,
            timestamp: get_block_timestamp(),
        });
        
        if new_status == CertificateStatus::Revoked {
            self.emit(CertificateRevoked {
                certificate_id,
                revoked_by: caller,
                reason,
                timestamp: get_block_timestamp(),
            });
        };
    }

    #[external(v0)]
    fn batch_issue_certificates(
        ref self: ContractState,
        batch_request: BatchCertificateRequest
    ) -> u256 {
        self.accesscontrol.assert_only_role(ISSUER_ROLE);
        
        let batch_id = self.batch_counter.read() + 1;
        self.batch_counter.write(batch_id);
        
        let mut certificate_ids = array![];
        let caller = get_caller_address();
        
        let mut i = 0;
        while i < batch_request.requests.len() {
            let request = *batch_request.requests.at(i);
            let certificate_id = self.issue_certificate_internal(caller, request);
            certificate_ids.append(certificate_id);
            i += 1;
        };
        
        // Store batch operation
        self.batch_operations.entry(batch_id).write(certificate_ids);
        
        self.emit(BatchCertificatesIssued {
            batch_id,
            issuer: caller,
            certificate_count: batch_request.requests.len().into(),
            certificate_ids,
            timestamp: get_block_timestamp(),
        });
        
        batch_id
    }

    // Certificate verification and integrity
    #[external(v0)]
    fn verify_certificate_integrity(
        self: @ContractState,
        certificate_id: u256,
        expected_hash: u256
    ) -> bool {
        let certificate = self.certificates.entry(certificate_id).read();
        if certificate.id == 0 {
            return false;
        };
        
        let stored_hash = self.certificate_hashes.entry(certificate_id).read();
        let is_valid = stored_hash == expected_hash;
        
        self.emit(CertificateHashVerified {
            certificate_id,
            hash: expected_hash,
            is_valid,
            verified_by: get_caller_address(),
            timestamp: get_block_timestamp(),
        });
        
        is_valid
    }

    // IPFS metadata management
    #[external(v0)]
    fn store_ipfs_metadata(
        ref self: ContractState,
        ipfs_hash: ByteArray,
        metadata: ByteArray
    ) {
        self.accesscontrol.assert_only_role(ISSUER_ROLE);
        self.ipfs_metadata_cache.entry(ipfs_hash).write(metadata);
    }

    #[external(v0)]
    fn get_ipfs_metadata(self: @ContractState, ipfs_hash: ByteArray) -> ByteArray {
        self.ipfs_metadata_cache.entry(ipfs_hash).read()
    }

    // Certificate ownership and access control
    #[external(v0)]
    fn get_certificate_owner(self: @ContractState, certificate_id: u256) -> ContractAddress {
        self.certificate_owners.entry(certificate_id).read()
    }

    #[external(v0)]
    fn get_certificate_issuer(self: @ContractState, certificate_id: u256) -> ContractAddress {
        self.certificate_issuers.entry(certificate_id).read()
    }

    #[external(v0)]
    fn is_certificate_owner(
        self: @ContractState,
        certificate_id: u256,
        address: ContractAddress
    ) -> bool {
        let owner = self.certificate_owners.entry(certificate_id).read();
        owner == address
    }

    // Certificate status queries
    #[external(v0)]
    fn get_certificates_by_status(
        self: @ContractState,
        owner: ContractAddress,
        status: CertificateStatus
    ) -> Array<u256> {
        match status {
            CertificateStatus::Active => self.active_certificates.entry(owner).read(),
            CertificateStatus::Revoked => self.revoked_certificates.entry(owner).read(),
            CertificateStatus::Expired => self.expired_certificates.entry(owner).read(),
            CertificateStatus::Suspended => array![], // Implement if needed
        }
    }

    #[external(v0)]
    fn get_certificate_status(self: @ContractState, certificate_id: u256) -> CertificateStatus {
        let certificate = self.certificates.entry(certificate_id).read();
        if certificate.id == 0 {
            return CertificateStatus::Active; // Default for non-existent
        };
        certificate.status
    }

    // Statistics and analytics
    #[external(v0)]
    fn get_certificate_statistics(self: @ContractState) -> (u256, u256, u256, u256) {
        (
            self.total_certificates.read(),
            self.total_active.read(),
            self.total_revoked.read(),
            self.total_expired.read()
        )
    }

    #[external(v0)]
    fn get_certificate_count_by_owner(self: @ContractState, owner: ContractAddress) -> u256 {
        let active_count = self.active_certificates.entry(owner).read().len();
        let revoked_count = self.revoked_certificates.entry(owner).read().len();
        let expired_count = self.expired_certificates.entry(owner).read().len();
        (active_count + revoked_count + expired_count).into()
    }

    // Administrative functions
    #[external(v0)]
    fn grant_issuer_role(ref self: ContractState, address: ContractAddress) {
        self.accesscontrol.assert_only_role(ADMIN_ROLE);
        self.accesscontrol.grant_role(ISSUER_ROLE, address);
    }

    #[external(v0)]
    fn revoke_issuer_role(ref self: ContractState, address: ContractAddress) {
        self.accesscontrol.assert_only_role(ADMIN_ROLE);
        self.accesscontrol.revoke_role(ISSUER_ROLE, address);
    }

    #[external(v0)]
    fn grant_revoker_role(ref self: ContractState, address: ContractAddress) {
        self.accesscontrol.assert_only_role(ADMIN_ROLE);
        self.accesscontrol.grant_role(REVOKER_ROLE, address);
    }

    // Internal helper functions
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn generate_unique_certificate_id(
            self: @ContractState,
            issuer: ContractAddress,
            recipient: ContractAddress,
            custom_data: ByteArray
        ) -> u256 {
            let counter = self.certificate_counter.read() + 1;
            self.certificate_counter.write(counter);
            
            // Generate hash-based unique ID
            let mut hash_data = array![];
            hash_data.append(issuer.into());
            hash_data.append(recipient.into());
            hash_data.append(counter.into());
            hash_data.append(get_block_timestamp().into());
            
            // Simple hash calculation (in production, use proper cryptographic hashing)
            let mut hash: u256 = 0;
            let mut i = 0;
            while i < hash_data.len() {
                hash = hash + (*hash_data.at(i)).into();
                i += 1;
            };
            
            hash
        }

        fn generate_certificate_hash(
            self: @ContractState,
            certificate_id: u256,
            issuer: ContractAddress,
            recipient: ContractAddress,
            metadata_uri: ByteArray,
            custom_data: ByteArray
        ) -> u256 {
            let mut hash_data = array![];
            hash_data.append(certificate_id.into());
            hash_data.append(issuer.into());
            hash_data.append(recipient.into());
            hash_data.append(get_block_timestamp().into());
            
            // Simple hash calculation (in production, use proper cryptographic hashing)
            let mut hash: u256 = 0;
            let mut i = 0;
            while i < hash_data.len() {
                hash = hash + (*hash_data.at(i)).into();
                i += 1;
            };
            
            hash
        }

        fn update_certificate_statistics(
            ref self: ContractState,
            certificate_id: u256,
            status: CertificateStatus,
            increment: bool
        ) {
            let change = if increment { 1 } else { -1 };
            
            match status {
                CertificateStatus::Active => {
                    let current = self.total_active.read();
                    self.total_active.write(current + change);
                },
                CertificateStatus::Revoked => {
                    let current = self.total_revoked.read();
                    self.total_revoked.write(current + change);
                },
                CertificateStatus::Expired => {
                    let current = self.total_expired.read();
                    self.total_expired.write(current + change);
                },
                CertificateStatus::Suspended => {}, // Handle if needed
            };
            
            if increment {
                let current = self.total_certificates.read();
                self.total_certificates.write(current + 1);
            };
        }

        fn add_certificate_to_status_list(
            ref self: ContractState,
            owner: ContractAddress,
            certificate_id: u256,
            status: CertificateStatus
        ) {
            match status {
                CertificateStatus::Active => {
                    let mut certificates = self.active_certificates.entry(owner).read();
                    certificates.append(certificate_id);
                    self.active_certificates.entry(owner).write(certificates);
                },
                CertificateStatus::Revoked => {
                    let mut certificates = self.revoked_certificates.entry(owner).read();
                    certificates.append(certificate_id);
                    self.revoked_certificates.entry(owner).write(certificates);
                },
                CertificateStatus::Expired => {
                    let mut certificates = self.expired_certificates.entry(owner).read();
                    certificates.append(certificate_id);
                    self.expired_certificates.entry(owner).write(certificates);
                },
                CertificateStatus::Suspended => {}, // Handle if needed
            };
        }

        fn remove_certificate_from_status_list(
            ref self: ContractState,
            owner: ContractAddress,
            certificate_id: u256,
            status: CertificateStatus
        ) {
            match status {
                CertificateStatus::Active => {
                    let mut certificates = self.active_certificates.entry(owner).read();
                    let mut new_certificates = array![];
                    let mut i = 0;
                    while i < certificates.len() {
                        let cert_id = *certificates.at(i);
                        if cert_id != certificate_id {
                            new_certificates.append(cert_id);
                        };
                        i += 1;
                    };
                    self.active_certificates.entry(owner).write(new_certificates);
                },
                CertificateStatus::Revoked => {
                    let mut certificates = self.revoked_certificates.entry(owner).read();
                    let mut new_certificates = array![];
                    let mut i = 0;
                    while i < certificates.len() {
                        let cert_id = *certificates.at(i);
                        if cert_id != certificate_id {
                            new_certificates.append(cert_id);
                        };
                        i += 1;
                    };
                    self.revoked_certificates.entry(owner).write(new_certificates);
                },
                CertificateStatus::Expired => {
                    let mut certificates = self.expired_certificates.entry(owner).read();
                    let mut new_certificates = array![];
                    let mut i = 0;
                    while i < certificates.len() {
                        let cert_id = *certificates.at(i);
                        if cert_id != certificate_id {
                            new_certificates.append(cert_id);
                        };
                        i += 1;
                    };
                    self.expired_certificates.entry(owner).write(new_certificates);
                },
                CertificateStatus::Suspended => {}, // Handle if needed
            };
        }

        fn issue_certificate_internal(
            ref self: ContractState,
            issuer: ContractAddress,
            request: CertificateRequest
        ) -> u256 {
            let certificate_id = self.generate_unique_certificate_id(issuer, request.recipient, request.custom_data);
            
            let certificate_hash = self.generate_certificate_hash(
                certificate_id,
                issuer,
                request.recipient,
                request.metadata_uri.clone(),
                request.custom_data
            );
            
            let certificate_data = CertificateData {
                id: certificate_id,
                issuer,
                recipient: request.recipient,
                metadata_uri: request.metadata_uri.clone(),
                timestamp: get_block_timestamp(),
                expiry_timestamp: request.expiry_timestamp,
                status: CertificateStatus::Active,
                revocation_reason: "",
                revocation_timestamp: 0,
                certificate_hash,
                version: 1,
                last_modified: get_block_timestamp(),
                modified_by: issuer,
            };
            
            self.certificates.entry(certificate_id).write(certificate_data);
            self.certificate_owners.entry(certificate_id).write(request.recipient);
            self.certificate_issuers.entry(certificate_id).write(issuer);
            self.certificate_metadata.entry(certificate_id).write(request.metadata_uri);
            
            self.update_certificate_statistics(certificate_id, CertificateStatus::Active, true);
            self.add_certificate_to_status_list(request.recipient, certificate_id, CertificateStatus::Active);
            
            self.certificate_hashes.entry(certificate_id).write(certificate_hash);
            self.hash_to_certificate.entry(certificate_hash).write(certificate_id);
            
            certificate_id
        }
    }
} 