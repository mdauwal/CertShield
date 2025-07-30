#[starknet::contract]
pub mod StarkCert {
    use core::num::traits::Zero;
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Map
    };
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::upgrades::UpgradeableComponent;
    use openzeppelin::upgrades::interface::IUpgradeable;
    
    use super::super::interfaces::{IStarkCert, Certificate, CertificateInput};

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);

    // Ownable Mixin
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    // Upgradeable
    impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        // Certificate storage
        certificates: Map<u256, Certificate>,
        certificate_counter: u256,
        
        // Issuer management
        authorized_issuers: Map<ContractAddress, bool>,
        
        // Recipient certificates mapping
        recipient_certificates: Map<ContractAddress, Array<u256>>,
        
        // Issuer certificates mapping
        issuer_certificates: Map<ContractAddress, Array<u256>>,
        
        // Statistics
        total_certificates: u256,
        active_certificates: u256,
        
        // Components
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        upgradeable: UpgradeableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        CertificateIssued: CertificateIssued,
        CertificateRevoked: CertificateRevoked,
        IssuerAuthorized: IssuerAuthorized,
        IssuerRemoved: IssuerRemoved,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CertificateIssued {
        #[key]
        pub certificate_id: u256,
        #[key]
        pub recipient: ContractAddress,
        #[key]
        pub issuer: ContractAddress,
        pub course_name: ByteArray,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CertificateRevoked {
        #[key]
        pub certificate_id: u256,
        #[key]
        pub issuer: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct IssuerAuthorized {
        #[key]
        pub issuer: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct IssuerRemoved {
        #[key]
        pub issuer: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.ownable.initializer(owner);
        self.certificate_counter.write(0);
        self.total_certificates.write(0);
        self.active_certificates.write(0);
    }

    #[abi(embed_v0)]
    impl UpgradeableImpl of IUpgradeable<ContractState> {
        fn upgrade(ref self: ContractState, new_class_hash: starknet::ClassHash) {
            self.ownable.assert_only_owner();
            self.upgradeable.upgrade(new_class_hash);
        }
    }

    #[abi(embed_v0)]
    impl StarkCertImpl of IStarkCert<ContractState> {
        fn issue_certificate(ref self: ContractState, certificate_data: CertificateInput) -> u256 {
            let caller = get_caller_address();
            assert(self.is_authorized_issuer(caller), 'Unauthorized issuer');
            
            let certificate_id = self.certificate_counter.read() + 1;
            self.certificate_counter.write(certificate_id);
            
            let certificate = Certificate {
                id: certificate_id,
                recipient: certificate_data.recipient,
                issuer: caller,
                course_name: certificate_data.course_name.clone(),
                issue_date: get_block_timestamp(),
                expiry_date: certificate_data.expiry_date,
                is_revoked: false,
                metadata_uri: certificate_data.metadata_uri,
            };
            
            self.certificates.entry(certificate_id).write(certificate);
            
            // Update statistics
            self.total_certificates.write(self.total_certificates.read() + 1);
            self.active_certificates.write(self.active_certificates.read() + 1);
            
            // Update mappings
            let mut recipient_certs = self.recipient_certificates.entry(certificate_data.recipient).read();
            recipient_certs.append(certificate_id);
            self.recipient_certificates.entry(certificate_data.recipient).write(recipient_certs);
            
            let mut issuer_certs = self.issuer_certificates.entry(caller).read();
            issuer_certs.append(certificate_id);
            self.issuer_certificates.entry(caller).write(issuer_certs);
            
            self.emit(CertificateIssued {
                certificate_id,
                recipient: certificate_data.recipient,
                issuer: caller,
                course_name: certificate_data.course_name,
            });
            
            certificate_id
        }

        fn revoke_certificate(ref self: ContractState, certificate_id: u256) {
            let caller = get_caller_address();
            let mut certificate = self.certificates.entry(certificate_id).read();
            
            assert(certificate.id != 0, 'Certificate does not exist');
            assert(certificate.issuer == caller, 'Only issuer can revoke');
            assert(!certificate.is_revoked, 'Certificate already revoked');
            
            certificate.is_revoked = true;
            self.certificates.entry(certificate_id).write(certificate);
            
            // Update active certificates count
            self.active_certificates.write(self.active_certificates.read() - 1);
            
            self.emit(CertificateRevoked {
                certificate_id,
                issuer: caller,
            });
        }

        fn verify_certificate(self: @ContractState, certificate_id: u256) -> bool {
            let certificate = self.certificates.entry(certificate_id).read();
            
            if certificate.id == 0 {
                return false;
            }
            
            if certificate.is_revoked {
                return false;
            }
            
            // Check if certificate has expired
            if certificate.expiry_date != 0 && get_block_timestamp() > certificate.expiry_date {
                return false;
            }
            
            true
        }

        fn get_certificate(self: @ContractState, certificate_id: u256) -> Certificate {
            self.certificates.entry(certificate_id).read()
        }

        fn get_certificates_by_recipient(self: @ContractState, recipient: ContractAddress) -> Array<u256> {
            self.recipient_certificates.entry(recipient).read()
        }

        fn get_certificates_by_issuer(self: @ContractState, issuer: ContractAddress) -> Array<u256> {
            self.issuer_certificates.entry(issuer).read()
        }

        fn add_authorized_issuer(ref self: ContractState, issuer: ContractAddress) {
            self.ownable.assert_only_owner();
            self.authorized_issuers.entry(issuer).write(true);
            
            self.emit(IssuerAuthorized { issuer });
        }

        fn remove_authorized_issuer(ref self: ContractState, issuer: ContractAddress) {
            self.ownable.assert_only_owner();
            self.authorized_issuers.entry(issuer).write(false);
            
            self.emit(IssuerRemoved { issuer });
        }

        fn is_authorized_issuer(self: @ContractState, issuer: ContractAddress) -> bool {
            self.authorized_issuers.entry(issuer).read()
        }

        fn get_total_certificates(self: @ContractState) -> u256 {
            self.total_certificates.read()
        }

        fn get_active_certificates_count(self: @ContractState) -> u256 {
            self.active_certificates.read()
        }
    }
}
