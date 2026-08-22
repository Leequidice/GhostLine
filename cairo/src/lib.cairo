// SPDX-License-Identifier: Apache-2.0
// GhostLine Private Yield Vault. Interface-compatible with STRK20 privacy_invoke.

use starknet::ContractAddress;

/// This is ABI-compatible with the STRK20 pool's OpenNoteDeposit return item.
/// Keeping the type local makes the helper independently reproducible.
#[derive(Serde, Drop)]
pub struct OpenNoteDeposit {
    pub note_id: felt252,
    pub token: ContractAddress,
    pub amount: u128,
}

#[starknet::interface]
pub trait IERC20<T> {
    fn balance_of(self: @T, account: ContractAddress) -> u256;
    fn approve(ref self: T, spender: ContractAddress, amount: u256) -> bool;
}

#[starknet::interface]
pub trait IVToken<T> {
    fn deposit(ref self: T, assets: u256, receiver: ContractAddress) -> u256;
    fn withdraw(
        ref self: T, assets: u256, receiver: ContractAddress, owner: ContractAddress,
    ) -> u256;
}

#[derive(Serde, Copy, Drop, PartialEq, Debug)]
pub enum YieldOperation {
    Deposit,
    Withdraw,
}

#[starknet::interface]
pub trait IGhostLineYieldVault<T> {
    fn privacy_invoke(
        ref self: T,
        operation: YieldOperation,
        in_token: ContractAddress,
        out_token: ContractAddress,
        assets: u256,
        note_id: felt252,
    ) -> Span<OpenNoteDeposit>;
}

mod errors {
    pub const ZERO_IN_TOKEN: felt252 = 'ZERO_IN_TOKEN';
    pub const ZERO_OUT_TOKEN: felt252 = 'ZERO_OUT_TOKEN';
    pub const ZERO_ASSETS: felt252 = 'ZERO_ASSETS';
    pub const TOKENS_EQUAL: felt252 = 'TOKENS_EQUAL';
    pub const RECEIVED_AMOUNT_OVERFLOW: felt252 = 'RECEIVED_AMOUNT_OVERFLOW';
    pub const ZERO_OUT_AMOUNT: felt252 = 'ZERO_OUT_AMOUNT';
}

#[starknet::contract]
pub mod GhostLineYieldVault {
    use core::num::traits::Zero;
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use super::{
        IERC20Dispatcher, IERC20DispatcherTrait, IGhostLineYieldVault, IVTokenDispatcher,
        IVTokenDispatcherTrait, OpenNoteDeposit, YieldOperation, errors,
    };

    #[storage]
    struct Storage {}

    #[constructor]
    fn constructor(ref self: ContractState) {}

    #[abi(embed_v0)]
    pub impl GhostLineYieldVaultImpl of IGhostLineYieldVault<ContractState> {
        fn privacy_invoke(
            ref self: ContractState,
            operation: YieldOperation,
            in_token: ContractAddress,
            out_token: ContractAddress,
            assets: u256,
            note_id: felt252,
        ) -> Span<OpenNoteDeposit> {
            assert(in_token.is_non_zero(), errors::ZERO_IN_TOKEN);
            assert(out_token.is_non_zero(), errors::ZERO_OUT_TOKEN);
            assert(assets.is_non_zero(), errors::ZERO_ASSETS);
            assert(in_token != out_token, errors::TOKENS_EQUAL);

            let helper = get_contract_address();
            let pool = get_caller_address();
            let input = IERC20Dispatcher { contract_address: in_token };
            let output = IERC20Dispatcher { contract_address: out_token };
            let balance_before = output.balance_of(account: helper);

            match operation {
                YieldOperation::Deposit => {
                    input.approve(spender: out_token, amount: assets);
                    IVTokenDispatcher { contract_address: out_token }
                        .deposit(:assets, receiver: helper);
                },
                YieldOperation::Withdraw => {
                    IVTokenDispatcher { contract_address: in_token }
                        .withdraw(:assets, receiver: helper, owner: helper);
                },
            }

            let balance_after = output.balance_of(account: helper);
            let received: u128 = (balance_after - balance_before)
                .try_into()
                .expect(errors::RECEIVED_AMOUNT_OVERFLOW);
            assert(received.is_non_zero(), errors::ZERO_OUT_AMOUNT);

            output.approve(spender: pool, amount: received.into());
            [OpenNoteDeposit { note_id, token: out_token, amount: received }].span()
        }
    }
}
