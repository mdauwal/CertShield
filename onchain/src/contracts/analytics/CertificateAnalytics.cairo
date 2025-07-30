#[starknet::contract]
pub mod CertificateAnalytics {
    use core::num::traits::Zero;
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Map
    };
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::upgrades::UpgradeableComponent;
    use openzeppelin::upgrades::interface::IUpgradeable;
    
    use super::super::super::interfaces::{Certificate, CertificateInput, ICertificateAnalytics};

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);

    // Ownable Mixin
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    // Upgradeable
    impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;

    // Analytics data structures
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
        pub verification_result: ByteArray, // "valid", "expired", "revoked", "not_found"
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
        pub avg_verification_time: u64, // in seconds
    }

    #[derive(Drop, Serde, starknet::Store)]
    pub struct InstitutionalMetrics {
        pub total_issued: u256,
        pub total_verified: u256,
        pub success_rate: u256, // percentage (0-10000 for 2 decimal places)
        pub avg_certificate_lifetime: u64, // in seconds
        pub revocation_rate: u256, // percentage
        pub last_activity: u64,
    }

    #[derive(Drop, Serde, starknet::Store)]
    pub struct AnalyticsReport {
        pub report_id: u256,
        // "daily", "weekly", "monthly", "custom"
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

    #[storage]
    struct Storage {
        // Core analytics data
        issuance_records: Map<u256, IssuanceRecord>,
        verification_records: Map<u256, VerificationRecord>,
        
        // Counters
        issuance_counter: u256,
        verification_counter: u256,
        report_counter: u256,
        
        // Time-based aggregations
        // key: day_timestamp
        daily_aggregations: Map<u64, TimeAggregation>, 
        // key: week_timestamp
        weekly_aggregations: Map<u64, TimeAggregation>, 
        // key: month_timestamp
        monthly_aggregations: Map<u64, TimeAggregation>, 
        
        // Institutional metrics
        issuer_metrics: Map<ContractAddress, InstitutionalMetrics>,
        recipient_metrics: Map<ContractAddress, InstitutionalMetrics>,
        
        // Reports storage
        generated_reports: Map<u256, AnalyticsReport>,
        
        // Query filters and settings
        analytics_enabled: bool,
        data_retention_days: u64,
        
        // Components
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        upgradeable: UpgradeableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        IssuanceRecorded: IssuanceRecorded,
        VerificationRecorded: VerificationRecorded,
        AnalyticsReportGenerated: AnalyticsReportGenerated,
        InstitutionalMetricsUpdated: InstitutionalMetricsUpdated,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event,
    }

    #[derive(Drop, starknet::Event)]
    pub struct IssuanceRecorded {
        #[key]
        pub certificate_id: u256,
        #[key]
        pub issuer: ContractAddress,
        #[key]
        pub recipient: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct VerificationRecorded {
        #[key]
        pub certificate_id: u256,
        #[key]
        pub verifier: ContractAddress,
        pub is_valid: bool,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AnalyticsReportGenerated {
        #[key]
        pub report_id: u256,
        pub report_type: ByteArray,
        pub total_issuances: u256,
        pub total_verifications: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct InstitutionalMetricsUpdated {
        #[key]
        pub institution: ContractAddress,
        pub total_issued: u256,
        pub success_rate: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.ownable.initializer(owner);
        self.analytics_enabled.write(true);
        // 1 year retention
        self.data_retention_days.write(365); 
        self.issuance_counter.write(0);
        self.verification_counter.write(0);
        self.report_counter.write(0);
    }

    #[abi(embed_v0)]
    impl UpgradeableImpl of IUpgradeable<ContractState> {
        fn upgrade(ref self: ContractState, new_class_hash: starknet::ClassHash) {
            self.ownable.assert_only_owner();
            self.upgradeable.upgrade(new_class_hash);
        }
    }

    #[abi(embed_v0)]
    impl CertificateAnalyticsImpl of ICertificateAnalytics<ContractState> {
        fn record_issuance(
            ref self: ContractState,
            certificate_id: u256,
            issuer: ContractAddress,
            recipient: ContractAddress,
            course_name: ByteArray,
            expiry_date: u64
        ) {
            self.record_issuance(certificate_id, issuer, recipient, course_name, expiry_date);
        }

        fn record_verification(
            ref self: ContractState,
            certificate_id: u256,
            verifier: ContractAddress,
            is_valid: bool,
            verification_result: ByteArray
        ) {
            self.record_verification(certificate_id, verifier, is_valid, verification_result);
        }

        fn get_analytics_data(
            self: @ContractState,
            start_timestamp: u64,
            end_timestamp: u64
        ) -> TimeAggregation {
            self.get_analytics_data(start_timestamp, end_timestamp)
        }

        fn generate_reports(
            ref self: ContractState,
            report_type: ByteArray,
            start_timestamp: u64,
            end_timestamp: u64
        ) -> u256 {
            self.generate_reports(report_type, start_timestamp, end_timestamp)
        }

        fn get_institutional_metrics(
            self: @ContractState,
            institution: ContractAddress,
            is_issuer: bool
        ) -> InstitutionalMetrics {
            self.get_institutional_metrics(institution, is_issuer)
        }

        fn get_comparative_analysis(
            self: @ContractState,
            institutions: Array<ContractAddress>,
            is_issuer: bool
        ) -> Array<InstitutionalMetrics> {
            self.get_comparative_analysis(institutions, is_issuer)
        }

        fn get_verification_frequency(
            self: @ContractState,
            certificate_id: u256
        ) -> u256 {
            self.get_verification_frequency(certificate_id)
        }

        fn get_usage_patterns(
            self: @ContractState,
            start_timestamp: u64,
            end_timestamp: u64
        ) -> Array<u256> {
            self.get_usage_patterns(start_timestamp, end_timestamp)
        }

        fn set_analytics_enabled(ref self: ContractState, enabled: bool) {
            self.set_analytics_enabled(enabled);
        }

        fn set_data_retention_days(ref self: ContractState, days: u64) {
            self.set_data_retention_days(days);
        }

        fn get_analytics_enabled(self: @ContractState) -> bool {
            self.get_analytics_enabled()
        }

        fn get_data_retention_days(self: @ContractState) -> u64 {
            self.get_data_retention_days()
        }
    }

    // Core analytics functions
    #[external(v0)]
    fn record_issuance(
        ref self: ContractState,
        certificate_id: u256,
        issuer: ContractAddress,
        recipient: ContractAddress,
        course_name: ByteArray,
        expiry_date: u64
    ) {
        assert(self.analytics_enabled.read(), 'Analytics disabled');
        
        let timestamp = get_block_timestamp();
        let record_id = self.issuance_counter.read() + 1;
        self.issuance_counter.write(record_id);
        
        let record = IssuanceRecord {
            certificate_id,
            issuer,
            recipient,
            course_name,
            timestamp,
            expiry_date,
        };
        
        self.issuance_records.entry(record_id).write(record);
        
        // Update time aggregations
        self.update_time_aggregations(timestamp, true, false, issuer, recipient, ContractAddress::default());
        
        // Update institutional metrics
        self.update_institutional_metrics(issuer, recipient, true, false);
        
        self.emit(IssuanceRecorded {
            certificate_id,
            issuer,
            recipient,
            timestamp,
        });
    }

    #[external(v0)]
    fn record_verification(
        ref self: ContractState,
        certificate_id: u256,
        verifier: ContractAddress,
        is_valid: bool,
        verification_result: ByteArray
    ) {
        assert(self.analytics_enabled.read(), 'Analytics disabled');
        
        let timestamp = get_block_timestamp();
        let record_id = self.verification_counter.read() + 1;
        self.verification_counter.write(record_id);
        
        let record = VerificationRecord {
            certificate_id,
            verifier,
            timestamp,
            is_valid,
            verification_result,
        };
        
        self.verification_records.entry(record_id).write(record);
        
        // Update time aggregations
        self.update_time_aggregations(timestamp, false, true, ContractAddress::default(), ContractAddress::default(), verifier);
        
        self.emit(VerificationRecorded {
            certificate_id,
            verifier,
            is_valid,
            timestamp,
        });
    }

    // Analytics data retrieval
    #[external(v0)]
    fn get_analytics_data(
        self: @ContractState,
        start_timestamp: u64,
        end_timestamp: u64
    ) -> TimeAggregation {
        let mut aggregation = TimeAggregation {
            total_issuances: 0,
            total_verifications: 0,
            successful_verifications: 0,
            failed_verifications: 0,
            unique_issuers: 0,
            unique_recipients: 0,
            unique_verifiers: 0,
            avg_verification_time: 0,
        };
        
        // Aggregate data from records within the time range
        let mut issuers = array![];
        let mut recipients = array![];
        let mut verifiers = array![];
        let mut verification_times = array![];
        
        // Process issuance records
        let mut i = 1;
        while i <= self.issuance_counter.read() {
            let record = self.issuance_records.entry(i).read();
            if record.timestamp >= start_timestamp && record.timestamp <= end_timestamp {
                aggregation.total_issuances += 1;
                
                // Track unique issuers and recipients
                if !self.address_in_array(record.issuer, issuers) {
                    issuers.append(record.issuer);
                }
                if !self.address_in_array(record.recipient, recipients) {
                    recipients.append(record.recipient);
                }
            };
            i += 1;
        };
        
        // Process verification records
        let mut j = 1;
        while j <= self.verification_counter.read() {
            let record = self.verification_records.entry(j).read();
            if record.timestamp >= start_timestamp && record.timestamp <= end_timestamp {
                aggregation.total_verifications += 1;
                
                if record.is_valid {
                    aggregation.successful_verifications += 1;
                } else {
                    aggregation.failed_verifications += 1;
                };
                
                // Track unique verifiers
                if !self.address_in_array(record.verifier, verifiers) {
                    verifiers.append(record.verifier);
                }
                
                // Calculate verification time (simplified)
                verification_times.append(record.timestamp);
            };
            j += 1;
        };
        
        aggregation.unique_issuers = issuers.len().into();
        aggregation.unique_recipients = recipients.len().into();
        aggregation.unique_verifiers = verifiers.len().into();
        
        // Calculate average verification time
        if verification_times.len() > 0 {
            let mut total_time: u64 = 0;
            let mut k = 0;
            while k < verification_times.len() {
                total_time += *verification_times.at(k);
                k += 1;
            };
            aggregation.avg_verification_time = total_time / verification_times.len();
        };
        
        aggregation
    }

    #[external(v0)]
    fn generate_reports(
        ref self: ContractState,
        report_type: ByteArray,
        start_timestamp: u64,
        end_timestamp: u64
    ) -> u256 {
        let report_id = self.report_counter.read() + 1;
        self.report_counter.write(report_id);
        
        let analytics_data = self.get_analytics_data(start_timestamp, end_timestamp);
        
        let success_rate = if analytics_data.total_verifications > 0 {
            (analytics_data.successful_verifications * 10000) / analytics_data.total_verifications
        } else {
            0
        };
        
        // Get top issuers and recipients (simplified implementation)
        let top_issuers = self.get_top_institutions(true, 5);
        let top_recipients = self.get_top_institutions(false, 5);
        
        let report = AnalyticsReport {
            report_id,
            report_type,
            start_timestamp,
            end_timestamp,
            total_issuances: analytics_data.total_issuances,
            total_verifications: analytics_data.total_verifications,
            success_rate,
            top_issuers,
            top_recipients,
            generated_at: get_block_timestamp(),
        };
        
        self.generated_reports.entry(report_id).write(report);
        
        self.emit(AnalyticsReportGenerated {
            report_id,
            report_type,
            total_issuances: analytics_data.total_issuances,
            total_verifications: analytics_data.total_verifications,
        });
        
        report_id
    }

    // Institutional performance metrics
    #[external(v0)]
    fn get_institutional_metrics(
        self: @ContractState,
        institution: ContractAddress,
        is_issuer: bool
    ) -> InstitutionalMetrics {
        if is_issuer {
            self.issuer_metrics.entry(institution).read()
        } else {
            self.recipient_metrics.entry(institution).read()
        }
    }

    #[external(v0)]
    fn get_comparative_analysis(
        self: @ContractState,
        institutions: Array<ContractAddress>,
        is_issuer: bool
    ) -> Array<InstitutionalMetrics> {
        let mut results = array![];
        let mut i = 0;
        while i < institutions.len() {
            let institution = *institutions.at(i);
            let metrics = self.get_institutional_metrics(institution, is_issuer);
            results.append(metrics);
            i += 1;
        };
        results
    }

    // Custom analytics queries
    #[external(v0)]
    fn get_verification_frequency(
        self: @ContractState,
        certificate_id: u256
    ) -> u256 {
        let mut frequency = 0;
        let mut i = 1;
        while i <= self.verification_counter.read() {
            let record = self.verification_records.entry(i).read();
            if record.certificate_id == certificate_id {
                frequency += 1;
            };
            i += 1;
        };
        frequency
    }

    #[external(v0)]
    fn get_usage_patterns(
        self: @ContractState,
        start_timestamp: u64,
        end_timestamp: u64
    ) -> Array<u256> {
        // Returns hourly usage patterns (24 hours)
        let mut patterns = array![];
        let mut hour = 0;
        while hour < 24 {
            let hour_start = start_timestamp + (hour * 3600);
            let hour_end = hour_start + 3600;
            
            let mut count = 0;
            let mut i = 1;
            while i <= self.verification_counter.read() {
                let record = self.verification_records.entry(i).read();
                if record.timestamp >= hour_start && record.timestamp < hour_end {
                    count += 1;
                };
                i += 1;
            };
            
            patterns.append(count);
            hour += 1;
        };
        patterns
    }

    // Administrative functions
    #[external(v0)]
    fn set_analytics_enabled(ref self: ContractState, enabled: bool) {
        self.ownable.assert_only_owner();
        self.analytics_enabled.write(enabled);
    }

    #[external(v0)]
    fn set_data_retention_days(ref self: ContractState, days: u64) {
        self.ownable.assert_only_owner();
        self.data_retention_days.write(days);
    }

    #[external(v0)]
    fn get_analytics_enabled(self: @ContractState) -> bool {
        self.analytics_enabled.read()
    }

    #[external(v0)]
    fn get_data_retention_days(self: @ContractState) -> u64 {
        self.data_retention_days.read()
    }

    // Internal helper functions
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn update_time_aggregations(
            ref self: ContractState,
            timestamp: u64,
            is_issuance: bool,
            is_verification: bool,
            issuer: ContractAddress,
            recipient: ContractAddress,
            verifier: ContractAddress
        ) {
            // Start of day
            let day_timestamp = timestamp - (timestamp % 86400); 
            // Start of week
            let week_timestamp = timestamp - (timestamp % 604800); 
            // Start of month (30 days)
            let month_timestamp = timestamp - (timestamp % 2592000); 
            
            // Update daily aggregation
            let mut daily = self.daily_aggregations.entry(day_timestamp).read();
            if is_issuance {
                daily.total_issuances += 1;
            };
            if is_verification {
                daily.total_verifications += 1;
            };
            self.daily_aggregations.entry(day_timestamp).write(daily);
            
            // Update weekly aggregation
            let mut weekly = self.weekly_aggregations.entry(week_timestamp).read();
            if is_issuance {
                weekly.total_issuances += 1;
            };
            if is_verification {
                weekly.total_verifications += 1;
            };
            self.weekly_aggregations.entry(week_timestamp).write(weekly);
            
            // Update monthly aggregation
            let mut monthly = self.monthly_aggregations.entry(month_timestamp).read();
            if is_issuance {
                monthly.total_issuances += 1;
            };
            if is_verification {
                monthly.total_verifications += 1;
            };
            self.monthly_aggregations.entry(month_timestamp).write(monthly);
        }

        fn update_institutional_metrics(
            ref self: ContractState,
            issuer: ContractAddress,
            recipient: ContractAddress,
            is_issuance: bool,
            is_verification: bool
        ) {
            if is_issuance {
                let mut issuer_metrics = self.issuer_metrics.entry(issuer).read();
                issuer_metrics.total_issued += 1;
                issuer_metrics.last_activity = get_block_timestamp();
                
                // Calculate success rate (simplified)
                if issuer_metrics.total_verified > 0 {
                    issuer_metrics.success_rate = (issuer_metrics.total_verified * 10000) / issuer_metrics.total_issued;
                };
                
                self.issuer_metrics.entry(issuer).write(issuer_metrics);
                
                let mut recipient_metrics = self.recipient_metrics.entry(recipient).read();
                recipient_metrics.total_issued += 1;
                recipient_metrics.last_activity = get_block_timestamp();
                self.recipient_metrics.entry(recipient).write(recipient_metrics);
            };
        }

        fn address_in_array(
            self: @ContractState,
            address: ContractAddress,
            addresses: Array<ContractAddress>
        ) -> bool {
            let mut i = 0;
            while i < addresses.len() {
                if *addresses.at(i) == address {
                    return true;
                };
                i += 1;
            };
            false
        }

        fn get_top_institutions(
            self: @ContractState,
            is_issuer: bool,
            limit: u32
        ) -> Array<ContractAddress> {
            // Simplified implementation - returns first N institutions
            let mut top_institutions = array![];
            let mut count = 0;
            
            // This is a simplified version - in production, you'd want to sort by metrics
            if is_issuer {
                // For issuers, we'd typically sort by total_issued
                // This is a placeholder implementation
                top_institutions.append(ContractAddress::default());
            } else {
                // For recipients, we'd typically sort by total_verified
                // This is a placeholder implementation
                top_institutions.append(ContractAddress::default());
            };
            
            top_institutions
        }
    }
} 