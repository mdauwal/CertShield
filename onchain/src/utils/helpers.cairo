use starknet::ContractAddress;

pub fn is_valid_address(address: ContractAddress) -> bool {
    address.is_non_zero()
}

pub fn is_future_timestamp(timestamp: u64, current_time: u64) -> bool {
    timestamp > current_time
}

pub fn calculate_certificate_hash(
    recipient: ContractAddress,
    issuer: ContractAddress,
    course_name: @ByteArray,
    issue_date: u64
) -> u256 {
    // Simple hash calculation for certificate verification
    // In production, you might want to use a more sophisticated hashing mechanism
    let mut hash_data = array![];
    hash_data.append(recipient.into());
    hash_data.append(issuer.into());
    hash_data.append(issue_date.into());
    
    // This is a simplified hash - in production use proper cryptographic hashing
    let mut result: u256 = 0;
    let mut i = 0;
    while i < hash_data.len() {
        result = result + (*hash_data.at(i)).into();
        i += 1;
    };
    result
}
