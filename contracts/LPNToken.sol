// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/*
 * ██╗     ██████╗ ███╗   ██╗    ████████╗ ██████╗ ██╗  ██╗███████╗███╗   ██╗
 * ██║     ██╔══██╗████╗  ██║    ╚══██╔══╝██╔═══██╗██║ ██╔╝██╔════╝████╗  ██║
 * ██║     ██████╔╝██╔██╗ ██║       ██║   ██║   ██║█████╔╝ █████╗  ██╔██╗ ██║
 * ██║     ██╔═══╝ ██║╚██╗██║       ██║   ██║   ██║██╔═██╗ ██╔══╝  ██║╚██╗██║
 * ███████╗██║     ██║ ╚████║       ██║   ╚██████╔╝██║  ██╗███████╗██║ ╚████║
 * ╚══════╝╚═╝     ╚═╝  ╚═══╝       ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝
 *
 * LPN TOKEN (LPNT)
 * BEP20 · 18 dp · fixed 1B supply
 * Utility token for LegacyPrime: Product-allocation swap + physical-product redemption.
 * 
 * Fixed supply — the entire 1,000,000,000 LPNT is minted to the deployer at construction; there is NO
 * mint function, so supply can never inflate. BEP20 is ERC20-compatible (bool-returning transfers,
 * 18 decimals) — no BSC-specific interface is required for wallets/BscScan.
 *
 * Ownership is RENOUNCED in the constructor: `owner()` returns address(0) immediately after deployment, so
 * anyone can verify on-chain (BscScan / wallets) that the token has no admin — no owner-gated levers exist,
 * and none can ever be added. Inherits OpenZeppelin `Ownable` purely to expose the standard `owner()` view.
 */

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title LPNToken — LPN TOKEN (LPNT)
/// @author LegacyPrime
/// @notice Fixed-supply BEP20 utility token for LegacyPrime. The entire 1,000,000,000 LPNT
///         (18 decimals) is minted to the deployer at construction and is used for the plan's
///         Product allocation (USDT->LPNT swap) and future physical-product redemption. There is
///         no mint function, so the supply can never inflate.
/// @dev Extends OpenZeppelin {ERC20} (name/symbol, 18 decimals, bool-returning transfers) and
///      {Ownable}. Ownership is renounced inside the constructor, so `owner()` returns
///      address(0) immediately after deployment; {Ownable} is inherited purely to expose the
///      standard `owner()` view for on-chain verification (BscScan / wallets). There are no
///      owner-gated functions and none can ever be added. BEP20 is ERC20-compatible, so no
///      BSC-specific interface is required. The LegacyPrime plan hardcodes this token's address.
contract LPNToken is ERC20, Ownable {
    /// @notice The fixed total supply of LPNT, minted in full to the deployer at construction.
    /// @dev 1,000,000,000 * 1e18 (18 decimals); the `ether` unit denotes the 1e18 scaling, not
    ///      BNB. Because there is no mint function, this is both the entire and the immutable
    ///      maximum supply. Exposed as a public constant getter for on-chain verification.
    uint256 public constant MAX_SUPPLY = 1_000_000_000 ether; // 1e9 * 1e18

    /// @notice Deploys LPN TOKEN: sets the name "LPN TOKEN" and symbol "LPNT" (18 decimals),
    ///         mints the entire {MAX_SUPPLY} to the deployer (msg.sender), then renounces
    ///         ownership so the token has no admin.
    /// @dev Passes msg.sender to {Ownable} solely so that `renounceOwnership()` can transfer
    ///      ownership to address(0) within this same call; after construction
    ///      `owner() == address(0)`. Takes no parameters and returns no value.
    constructor() ERC20("LPN TOKEN", "LPNT") Ownable(msg.sender) {
        _mint(msg.sender, MAX_SUPPLY);
        renounceOwnership();
    }
}