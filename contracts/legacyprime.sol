// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/*
 * ██╗     ███████╗ ██████╗  █████╗  ██████╗██╗   ██╗    ██████╗ ██████╗ ██╗███╗   ███╗███████╗
 * ██║     ██╔════╝██╔════╝ ██╔══██╗██╔════╝╚██╗ ██╔╝    ██╔══██╗██╔══██╗██║████╗ ████║██╔════╝
 * ██║     █████╗  ██║  ███╗███████║██║      ╚████╔╝     ██████╔╝██████╔╝██║██╔████╔██║█████╗
 * ██║     ██╔══╝  ██║   ██║██╔══██║██║       ╚██╔╝      ██╔═══╝ ██╔══██╗██║██║╚██╔╝██║██╔══╝
 * ███████╗███████╗╚██████╔╝██║  ██║╚██████╗   ██║       ██║     ██║  ██║██║██║ ╚═╝ ██║███████╗
 * ╚══════╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝   ╚═╝       ╚═╝     ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚══════╝
 *
 * LegacyPrime — tiered (70 / 100 / 200 USDT) entry-package affiliate plan. Payment token = USDT (BSC, 18 dp). Single-file,
 * self-contained (inlined IERC20 / Ownable / AdminOwnable / ReentrancyGuard), modeled on the MoVi skeleton.
 *
 * TWO STRUCTURES
 *   • Referral tree   — set on register(sponsor): parent + children[]. Drives Referral + Leaders bonuses.
 *   • Global one-line — set on FIRST activation, by activation order: `line` = the previous global
 *                       activator. Drives the Generation bonus (walk up the single line).
 *
 * ENTRY TIERS — activate(amount) must match one of 70 / 100 / 200 USDT; all 8 allocations + the cap scale
 *   with the chosen tier. Split (BPS-configurable; sums to exactly 100%, enforced) — USDT shown for the 100 tier:
 *   Referral       10% 10   → direct referral sponsor                     (CAPPED income)
 *   Generation   1%×10 10   → 10 nearest ACTIVE one-line uplines (1 ea)   (CAPPED income)
 *   Leaders(match) 10% 10   → referral sponsor of each one-line earner    (CAPPED income, 100% match)
 *   Cashback       10% 10   → sponsor cashBack (+10/direct)  (CAPPED income; claimed in 20%-of-tier chunks)
 *   Incentive      20% 20   → incentiveBalance (admin-withdrawable via withdrawIncentive)
 *   Product        20% 20   → LPNT to buyer: from reserve (retain USDT) → else swap USDT→LPNT via LP mgr → else retain
 *   Liquidity      10% 10   → LP manager via addLiquidityUSDT (fallback: liquidityBalance → LP wallet)
 *   Profit         10% 10   → profitBalance (+ all roll-up residuals)
 *
 * EARNINGS-CAP LIFECYCLE (countdown cappingBalance)
 *   Each activation TOPS UP cappingBalance by capBps of the chosen tier (400% = 4× by default). Every capped bonus the member earns
 *   — Cashback + Referral + Generation + Leaders — draws cappingBalance DOWN. When it hits 0 the account
 *   DEACTIVATES (isActivated=false); it renews by activating again (+140, keeps its original one-line slot).
 *   No time expiry. A bonus that would exceed the remaining cappingBalance, or is owed to an inactive/absent
 *   member, is booked to profitBalance (pay only up to the balance — no roll-up). Generation still
 *   AUTO-COMPRESSES: inactive one-line members are skipped so the 10 levels pay the nearest active members.
 *   Root/owner is the cap-exempt, always-active company anchor at the top of both chains.
 *
 * MONEY FLOW  walletBalance in: deposit (≥ entry package), referral, generation, leaders. out: withdraw.
 *   No collect step — bonuses are immediately withdrawable. The Product allocation ACCRUES to tokenBalance at
 *   activation (no token calls there — keeps activate cheap) and is redeemed later via withdrawToken (LPNT from
 *   the in-contract reserve, else a USDT→LPNT swap). USDT can leave only via withdraw, the Liquidity allocation
 *   (routed to the LP manager; else retained in liquidityBalance), or a Product swap on redemption. Every entry's
 *   USDT stays in-contract at activation and all else credits internal balances → solvent by construction.
 */

/* -------------------------------------------------------------------------- */
/*                                  IERC20                                     */
/* -------------------------------------------------------------------------- */
/// @title IERC20
/// @author LegacyPrime
/// @notice Minimal ERC20 interface — only the four calls LegacyPrime makes on USDT and LPNT.
/// @dev Boolean returns are treated leniently by the `_safe*` wrappers to tolerate non-standard tokens.
interface IERC20 {
    /// @notice Transfer `amount` tokens from the caller to `to`.
    /// @param to Recipient address.
    /// @param amount Token amount, in the token's smallest unit.
    /// @return Whether the transfer succeeded.
    function transfer(address to, uint256 amount) external returns (bool);
    /// @notice Transfer `amount` tokens from `from` to `to` using the caller's allowance.
    /// @param from Source address (must have approved the caller).
    /// @param to Recipient address.
    /// @param amount Token amount, in the token's smallest unit.
    /// @return Whether the transfer succeeded.
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    /// @notice Approve `spender` to move up to `amount` of the caller's tokens.
    /// @param spender Address granted the allowance.
    /// @param amount Allowance amount, in the token's smallest unit.
    /// @return Whether the approval succeeded.
    function approve(address spender, uint256 amount) external returns (bool);
    /// @notice Token balance held by `account`.
    /// @param account Address to query.
    /// @return The account's token balance.
    function balanceOf(address account) external view returns (uint256);
}

/* -------------------------------------------------------------------------- */
/*        ILiquidity — external LP manager (adapted from AEOS ILiquidity)     */
/* -------------------------------------------------------------------------- */
/// @title ILiquidity — external LP manager (adapted from AEOS ILiquidity)
/// @author LegacyPrime
/// @notice Minimal interface to the LegacyPrime liquidity manager. `addLiquidityUSDT` pulls USDT from the
///         caller (this contract must approve first) and returns the liquidity added (0 on failure).
///         `TOKENID` is 0 until the manager's LP position is initialized.
/// @dev The plan calls these best-effort under `try/catch`; a manager of address(0) or a zero TOKENID
///      disables routing/swaps so the allocation falls back to in-contract balances.
interface ILiquidity {
    /// @notice Add `usdtAmount` USDT to the managed LP position.
    /// @param usdtAmount USDT to contribute (the plan must approve the manager first).
    /// @param slippageBps Max slippage tolerated, in basis points.
    /// @param deadline Unix timestamp after which the call must revert.
    /// @return The amount of liquidity added (0 signals failure; the plan then retains the USDT).
    function addLiquidityUSDT(uint256 usdtAmount, uint24 slippageBps, uint256 deadline) external returns (uint256);
    /// @notice Swap `usdtAmount` USDT to LPNT and send the LPNT to `recipient`.
    /// @param usdtAmount USDT to spend on the swap.
    /// @param slippageBps Max slippage tolerated, in basis points.
    /// @param recipient Address that receives the swapped LPNT.
    /// @param deadline Unix timestamp after which the call must revert.
    /// @return The amount of LPNT delivered to `recipient`.
    function swapUSDTToLPNT(uint256 usdtAmount, uint24 slippageBps, address recipient, uint256 deadline)
        external returns (uint256);
    /// @notice The manager's LP position token id.
    /// @return The position id, or 0 while the manager's LP position is uninitialized.
    function TOKENID() external view returns (uint256);
}

/* -------------------------------------------------------------------------- */
/*                          Ownable (minimal, inlined)                        */
/* -------------------------------------------------------------------------- */
/// @title Ownable
/// @author LegacyPrime
/// @notice Minimal single-owner access control (inlined, no external dependency).
/// @dev The owner is stored privately and exposed via `owner()`; guards use the `onlyOwner` modifier.
abstract contract Ownable {
    /// @dev The current owner address.
    address private _owner;
    /// @notice Emitted when ownership moves from `previousOwner` to `newOwner` (including the initial set).
    /// @param previousOwner The prior owner (address(0) at construction).
    /// @param newOwner The new owner.
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /// @notice Set the initial owner at deployment.
    /// @param initialOwner The address to grant ownership; must be non-zero.
    /// @dev Reverts with OWNABLE_ZERO_OWNER if `initialOwner` is the zero address.
    constructor(address initialOwner) {
        require(initialOwner != address(0), "OWNABLE_ZERO_OWNER");
        _owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    /// @dev Restricts a function to the current owner; reverts NOT_OWNER otherwise.
    modifier onlyOwner() {
        require(msg.sender == _owner, "NOT_OWNER");
        _;
    }

    /// @notice The current owner of the contract.
    /// @return The owner address.
    function owner() public view returns (address) {
        return _owner;
    }

    /// @notice Transfer ownership to `newOwner`. Owner-only.
    /// @param newOwner The address to become the new owner; must be non-zero.
    /// @dev Reverts ZERO_ADDRESS if `newOwner` is zero; emits OwnershipTransferred.
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

/* -------------------------------------------------------------------------- */
/*                               AdminOwnable                                 */
/* -------------------------------------------------------------------------- */
/// @title AdminOwnable
/// @author LegacyPrime
/// @notice Adds a set of admin addresses on top of `Ownable`. The owner is always an implicit admin.
/// @dev Admin membership gates operational functions via `onlyAdmin`; owner-only functions manage the set.
abstract contract AdminOwnable is Ownable {
    /// @notice Whether an address is an admin (the owner is always treated as an admin regardless).
    mapping(address => bool) public isAdmin;

    /// @notice Emitted when `admin` is granted admin rights.
    /// @param admin The newly added admin address.
    event AdminAdded(address indexed admin);
    /// @notice Emitted when `admin` has its admin rights revoked.
    /// @param admin The removed admin address.
    event AdminRemoved(address indexed admin);

    /// @dev Restricts a function to the owner or any admin; reverts NOT_AUTHORIZED_ADMIN otherwise.
    modifier onlyAdmin() {
        require(msg.sender == owner() || isAdmin[msg.sender], "NOT_AUTHORIZED_ADMIN");
        _;
    }

    /// @notice Grant admin rights to `adminAddress`. Owner-only.
    /// @param adminAddress Address to promote; must be non-zero and not already an admin.
    /// @dev Reverts ZERO_ADDRESS / ALREADY_ADMIN; emits AdminAdded.
    function addAdmin(address adminAddress) external onlyOwner {
        require(adminAddress != address(0), "ZERO_ADDRESS");
        require(!isAdmin[adminAddress], "ALREADY_ADMIN");
        isAdmin[adminAddress] = true;
        emit AdminAdded(adminAddress);
    }

    /// @notice Revoke admin rights from `adminAddress`. Owner-only. Virtual — LegacyPrime overrides it to
    ///         protect the root admin.
    /// @param adminAddress Address to demote; must be non-zero and currently an admin.
    /// @dev Reverts ZERO_ADDRESS / NOT_ADMIN; emits AdminRemoved.
    function removeAdmin(address adminAddress) external virtual onlyOwner {
        require(adminAddress != address(0), "ZERO_ADDRESS");
        require(isAdmin[adminAddress], "NOT_ADMIN");
        isAdmin[adminAddress] = false;
        emit AdminRemoved(adminAddress);
    }

    /// @notice Whether `addr` has admin authority (owner or explicit admin).
    /// @param addr Address to check.
    /// @return True if `addr` is the owner or an admin.
    function checkIsAdmin(address addr) external view returns (bool) {
        return addr == owner() || isAdmin[addr];
    }
}

/* -------------------------------------------------------------------------- */
/*                       ReentrancyGuard (minimal, inlined)                   */
/* -------------------------------------------------------------------------- */
/// @title ReentrancyGuard
/// @author LegacyPrime
/// @notice Prevents nested (re-entrant) calls to functions marked `nonReentrant`.
/// @dev Uses a simple 1/2 status flag rather than a boolean to avoid the zero-to-nonzero SSTORE cost.
abstract contract ReentrancyGuard {
    /// @dev Reentrancy status: 1 = not entered, 2 = entered.
    uint256 private _status = 1; // 1 = not entered, 2 = entered

    /// @dev Blocks re-entry while the guarded body runs; reverts REENTRANCY on a nested call.
    modifier nonReentrant() {
        require(_status == 1, "REENTRANCY");
        _status = 2;
        _;
        _status = 1;
    }
}

/* ========================================================================== */
/*                                LegacyPrime                                  */
/* ========================================================================== */
/// @title LegacyPrime
/// @author LegacyPrime
/// @notice Two-structure affiliate compensation plan on BSC: a referral tree and a global one-line, paid in
///         USDT across eight allocations per entry, with a countdown earnings cap and an LPNT Product payout.
/// @dev Self-contained and solvent-by-construction — every entry's USDT stays in-contract at activation and
///      bonuses credit internal balances. USDT and LPNT are hardcoded in the constructor. See the file banner
///      for the full economic model (tiers, split, cap lifecycle, money flow).
contract LegacyPrime is AdminOwnable, ReentrancyGuard {
    /* --------------------------- Immutables ---------------------------- */
    /// @notice The payment token (BSC USDT, 18 decimals); hardcoded at construction.
    IERC20 public immutable usdt; // payment token (BSC USDT, 18 decimals)
    /// @notice The LPN TOKEN reserve used to settle the Product allocation; hardcoded at construction.
    IERC20 public immutable lpnt; // LPN TOKEN reserve used for the Product allocation

    /* ---------------------------- Genealogy ---------------------------- */
    /// @notice A member's position in both structures — referral tree (referral + children) and one-line (line).
    /// @dev `referral` is set on register; `line` is set on first activation; `children` lists direct referrals.
    struct Affiliate {
        address referral;   // referral-tree sponsor (set on register)
        address line;       // one-line predecessor, global (set on first activation)
        address[] children; // direct referrals in the referral tree
    }

    /// @dev Per-member genealogy record, keyed by member address.
    mapping(address => Affiliate) private _affiliate;
    /// @dev parent => child => (index in parent.children)+1; 0 = absent. Enables O(1) child removal.
    // parent => child => (index in parent.children) + 1; 0 = absent. Enables O(1) child removal.
    mapping(address => mapping(address => uint256)) private _childIndexPlus1;
    /// @notice The cap-exempt, always-active company anchor at the top of both chains.
    address public root;                          // cap-exempt, always-active company anchor
    /// @notice The most recent first-time activator; the next first activator points its `line` here.
    address public lineTail;                      // last first-time activator (new activators point their line here)
    /// @notice Total registered members, including root.
    uint256 public totalUsers;

    /// @notice Whether an address is registered into the referral tree.
    mapping(address => bool) public isUser;       // registered into the referral tree
    /// @notice Whether an address is currently in an active (uncapped) earning cycle.
    mapping(address => bool) public isActivated;  // currently in an active (uncapped) cycle
    /// @dev Whether a member's permanent one-line slot has been assigned (i.e. first activation done).
    mapping(address => bool) private _hasLineSlot;// one-line position already assigned (first activation done)

    /* ----------------------------- Balances ---------------------------- */
    /// @notice Withdrawable USDT balance per member (deposits + Referral/Generation/Leaders income).
    mapping(address => uint256) public walletBalance;   // withdrawable (deposit + referral/generation/leaders)
    /// @notice Claimable cashback per member (accrues +cashBackBps of a direct's entry per direct referral).
    mapping(address => uint256) public cashBack;        // claimable cashback (accrues +cashBackBps of entry per direct)
    /// @notice Accrued Product allocation (in USDT terms) per member, redeemed to LPNT via withdrawToken.
    mapping(address => uint256) public tokenBalance;    // accrued Product allocation (USDT), redeemed to LPNT via withdrawToken

    /// @notice Incentive pool (USDT); accrues on each activation, admin-withdrawable via withdrawIncentive.
    uint256 public incentiveBalance; // accrues on activation; admin-withdrawable via withdrawIncentive(to,amt)
    /// @notice Liquidity fallback pool (USDT) for allocations that couldn't be routed to the LP manager.
    uint256 public liquidityBalance; // Liquidity fallback pool; admin-withdrawable via withdrawLiquidity(to,amt)
    /// @notice USDT retained when Product redemptions are served from the in-contract LPNT reserve.
    uint256 public productBalance;   // USDT retained from redeemed Product allocations (reserve/withdrawToken path)
    /// @notice Protocol profit pool (USDT), including all cap-overflow and roll-up residuals.
    uint256 public profitBalance;    // protocol profit + all roll-up residuals
    /// @notice Accrued withdraw processing fees (USDT), net of the systemFee carve-out.
    uint256 public collectedFees;    // accrued withdraw processing fees

    /* -------------------- Earnings cap (2× lifecycle) ------------------ */
    /// @notice Remaining earnable income this cycle per member; topped up by capBps of the tier on activate,
    ///         drawn down by Cashback/Referral/Generation/Leaders; reaching 0 deactivates the member.
    mapping(address => uint256) public cappingBalance; // remaining earnable this cycle: +2×entry on activate, drawn down by cashback+referral+generation+leaders; 0 => deactivated
    /// @notice Number of times a member has activated (first activation + re-entries).
    mapping(address => uint256) public activationCount;

    /* --------------------------- Lifetime trackers -------------------- */
    /// @notice Lifetime Referral income earned by a member (USDT).
    mapping(address => uint256) public referralBalance;   // lifetime Referral income
    /// @notice Lifetime Generation income earned by a member (USDT).
    mapping(address => uint256) public generationBalance; // lifetime Generation income
    /// @notice Lifetime Leaders (matching) income earned by a member (USDT).
    mapping(address => uint256) public leadersBalance;    // lifetime Leaders income
    /// @notice Current direct-referral count per member.
    mapping(address => uint256) public totalDirects;      // direct referral count

    /* ---------------------------- Cooldowns ---------------------------- */
    /// @notice Last block in which a member made an antiSpam-guarded call (one call per block).
    mapping(address => uint256) public lastCallBlock;
    /// @notice Last timestamp a member made an antiSpam-guarded call (transaction cooldown).
    mapping(address => uint256) public lastCallTime;
    /// @notice Last timestamp a member withdrew or deposited (withdraw cooldown anchor).
    mapping(address => uint256) public lastWithdraw;

    /* ------------------------- Entry tiers ----------------------------- */
    // Three entry packages; activate(amount) must match one. All 8 allocations + the cap scale with the chosen
    // tier. activePackage[user] tracks the tier of the member's current cycle (drives their cashback claim size).
    /// @notice Entry tier A (smallest); default 70 USDT.
    uint256 public entryPackageA        = 70e18;   // 70 USDT
    /// @notice Entry tier B (middle); default 100 USDT.
    uint256 public entryPackageB        = 100e18;  // 100 USDT
    /// @notice Entry tier C (largest); default 200 USDT.
    uint256 public entryPackageC        = 200e18;  // 200 USDT
    /// @notice The tier a member last activated at (0 = never); drives their cashback claim size.
    mapping(address => uint256) public activePackage; // tier the member last activated at (0 = never)

    /* -------------------- Configurable parameters ---------------------- */
    /// @notice Recipient of the flat systemFee carve-out (defaults to the deployer).
    address public systemWallet;                    // recipient of systemFee (set to deployer at construction)
    /// @notice Flat operator fee (USDT) carved from each withdraw's processing fee (clamped to that fee).
    uint256 public systemFee            = 1e18;     // flat operator fee (USDT) carved from each withdraw's fee
    /// @notice Referral allocation weight, in basis points (default 10%).
    uint256 public referralBps          = 1000;     // 10%
    /// @notice Generation allocation weight per one-line level, in basis points (default 1% per level).
    uint256 public generationBpsPerLevel= 100;      // 1% per level
    /// @notice Number of one-line levels the Generation bonus pays (default 10).
    uint256 public generationLevels     = 10;       // levels paid up the one-line
    /// @notice Leaders match rate applied to each one-line earner's generation share, in bps (default 100%).
    uint256 public leadersMatchBps      = 10000;    // 100% match of each one-line earner's generation
    /// @notice Cashback allocation weight, in basis points (default 10%) → sponsor cashBack per direct.
    uint256 public cashBackBps          = 1000;     // 10% → sponsor cashBack per direct
    /// @notice Incentive allocation weight, in basis points (default 20%) → incentiveBalance.
    uint256 public incentiveBps         = 2000;     // 20% → incentiveBalance
    /// @notice Product allocation weight, in basis points (default 20%) → LPNT to the buyer.
    uint256 public productBps           = 2000;     // 20% → Product (LPNT to buyer)
    /// @notice Liquidity allocation weight, in basis points (default 10%) → LP manager / liquidityBalance.
    uint256 public liquidityBps         = 1000;     // 10% → liquidityBalance
    /// @notice Profit allocation weight, in basis points (default 10%) → profitBalance.
    uint256 public profitBps            = 1000;     // 10% → profitBalance
    /// @notice Earnings-cap multiplier of the entry, in basis points (default 40000 = 400% = 4×).
    uint256 public capBps               = 40000;    // 400% earnings cap
    /// @notice Withdraw processing fee, in basis points (default 10%) — the member's only deduction.
    uint256 public withdrawFeeBps       = 1000;     // 10% processing fee
    /// @notice Cashback claim size as a fraction of the claimer's active tier, in bps (default 20%).
    uint256 public cashBackClaimBps     = 2000;     // each claim = 20% of the member's active package
    /// @notice Minimum time between withdrawals per member (default 24 hours).
    uint256 public withdrawCooldown     = 24 hours;
    /// @notice Minimum withdrawal amount in USDT (default 10 USDT).
    uint256 public minWithdraw          = 10e18;    // min withdraw amount
    /// @notice Per-account cooldown between antiSpam-guarded calls (default 9 seconds).
    uint256 public transactionCooldown  = 9 seconds;
    /// @notice Upper bound on one-line iterations during compress/roll-up walks (gas guard, default 200).
    uint256 public maxScan              = 200;      // gas bound for compress/roll-up walks
    /// @notice LPNT delivered per 1 USDT of Product, 1e18-scaled (100e18 = 1 LPNT costs 0.01 USDT).
    uint256 public productRate          = 100e18;   // LPNT per 1 USDT (1e18-scaled); 100e18 = 1 LPNT is 0.01 USDT
    /// @notice Whether user-facing entry points are paused.
    bool    public paused;

    /* ----------------------- Liquidity routing ------------------------ */
    /// @notice External LP manager; address(0) disables routing so the allocation accrues to liquidityBalance.
    ILiquidity public liquidity;               // external LP manager (address(0) => accrue to liquidityBalance)
    /// @notice Slippage (bps) passed to the LP manager's addLiquidityUSDT / swaps (default 0.5%).
    uint256 public liquiditySlippageBps = 500; // slippage passed to addLiquidityUSDT (0.5% default)

    /// @dev Basis-points denominator (100% = 10,000).
    uint256 private constant BPS = 10_000;

    /* --------------------------- Bonus kinds --------------------------- */
    /// @dev Bonus kind tag: Referral income.
    uint8 private constant K_REFERRAL   = 0;
    /// @dev Bonus kind tag: Generation (one-line) income.
    uint8 private constant K_GENERATION = 1;
    /// @dev Bonus kind tag: Leaders (matching) income.
    uint8 private constant K_LEADERS    = 2;
    /// @dev Bonus kind tag: Cashback — routed to cashBack (claimable), not walletBalance.
    uint8 private constant K_CASHBACK   = 3; // routed to cashBack (claimable), not walletBalance

    /* ------------------------------ Events ----------------------------- */
    /// @notice Emitted when a member registers into the referral tree.
    /// @param user The newly registered member.
    /// @param sponsor The member's referral-tree sponsor.
    event Registered(address indexed user, address indexed sponsor);
    /// @notice Emitted when a member deposits USDT into their walletBalance.
    /// @param user The depositing member.
    /// @param amount USDT deposited.
    event Deposited(address indexed user, uint256 amount);
    /// @notice Emitted when a member activates (pays an entry tier).
    /// @param user The activating member.
    /// @param amount The entry tier paid.
    /// @param activationCount The member's activation count after this activation.
    /// @param reentry True if this is a re-entry (a prior one-line slot already existed).
    event Activated(address indexed user, uint256 amount, uint256 activationCount, bool reentry);
    /// @notice Emitted when a member's cappingBalance reaches 0 and the account deactivates.
    /// @param user The deactivated member.
    event Deactivated(address indexed user); // cappingBalance hit 0
    /// @notice Emitted when a capped bonus is paid to a member's walletBalance.
    /// @param earner The member credited.
    /// @param from The member whose activation generated the bonus.
    /// @param kind Bonus kind (0=Referral, 1=Generation, 2=Leaders).
    /// @param amount USDT credited.
    event BonusPaid(address indexed earner, address indexed from, uint8 kind, uint256 amount);
    /// @notice Emitted when cashback accrues to a sponsor.
    /// @param sponsor The sponsor credited.
    /// @param amount Cashback added.
    /// @param newBalance The sponsor's cashBack balance after accrual.
    event CashBackAccrued(address indexed sponsor, uint256 amount, uint256 newBalance);
    /// @notice Emitted when a member claims a cashback chunk.
    /// @param user The claiming member.
    /// @param amount USDT paid out.
    /// @param remaining The member's cashBack balance after the claim.
    event CashBackClaimed(address indexed user, uint256 amount, uint256 remaining);
    /// @notice Emitted when a member withdraws USDT.
    /// @param user The withdrawing member.
    /// @param net USDT sent to the member (amount − fee).
    /// @param fee Processing fee deducted.
    event Withdrawn(address indexed user, uint256 net, uint256 fee);
    /// @notice Emitted when the Product allocation is booked to a buyer's tokenBalance at activation.
    /// @param user The buyer.
    /// @param usdtAmount Product allocation (USDT) accrued.
    event ProductAccrued(address indexed user, uint256 usdtAmount);                // Product allocation booked to tokenBalance at activation
    /// @notice Emitted when a member redeems their accrued tokenBalance via withdrawToken.
    /// @param user The redeeming member.
    /// @param usdtAmount tokenBalance (USDT) redeemed.
    event TokenWithdrawn(address indexed user, uint256 usdtAmount);                // member redeemed their tokenBalance
    /// @notice Emitted when Product LPNT is delivered from the in-contract reserve (USDT retained).
    /// @param user The recipient.
    /// @param usdtIn USDT value redeemed.
    /// @param lpntOut LPNT delivered from reserve.
    event ProductDelivered(address indexed user, uint256 usdtIn, uint256 lpntOut); // LPNT from reserve (on redemption)
    /// @notice Emitted when Product LPNT is market-swapped for the buyer (USDT spent).
    /// @param user The recipient.
    /// @param usdtIn USDT spent on the swap.
    /// @param lpntOut LPNT delivered from the swap.
    event ProductSwapped(address indexed user, uint256 usdtIn, uint256 lpntOut);   // LPNT market-swapped (USDT spent, on redemption)
    /// @notice Emitted when the Liquidity allocation is successfully routed to the LP manager.
    /// @param usdtIn USDT routed.
    /// @param lpAdded Liquidity reported added by the manager.
    event LiquidityRouted(uint256 usdtIn, uint256 lpAdded);        // routed to the LP manager
    /// @notice Emitted when LP routing fails and the USDT is retained in liquidityBalance.
    /// @param usdtIn USDT that fell back to liquidityBalance.
    /// @param reason Failure reason (revert string or a sentinel).
    event LiquidityRoutingFailed(uint256 usdtIn, string reason);   // retained in liquidityBalance instead
    /// @notice Emitted when the LP manager address is set (or cleared).
    /// @param manager The new LP manager (address(0) disables routing).
    event LiquiditySet(address indexed manager);
    /// @notice Emitted when unplaceable capped income (overflow / inactive / unfilled levels) is booked to profit.
    /// @param kind Bonus kind the residual came from.
    /// @param amount USDT booked to profitBalance.
    event Residual(uint8 kind, uint256 amount); // unplaceable capped income → profitBalance
    /// @notice Emitted when an admin withdraws from the incentive pool.
    /// @param to Recipient address.
    /// @param amount USDT withdrawn.
    event IncentiveWithdrawn(address indexed to, uint256 amount);
    /// @notice Emitted when an admin withdraws from the liquidity fallback pool.
    /// @param to Recipient address.
    /// @param amount USDT withdrawn.
    event LiquidityWithdrawn(address indexed to, uint256 amount);
    /// @notice Emitted when an admin withdraws from the profit pool.
    /// @param to Recipient address.
    /// @param amount USDT withdrawn.
    event ProfitWithdrawn(address indexed to, uint256 amount);
    /// @notice Emitted when an admin withdraws retained Product USDT.
    /// @param to Recipient address.
    /// @param amount USDT withdrawn.
    event ProductWithdrawn(address indexed to, uint256 amount);
    /// @notice Emitted when an admin withdraws accrued processing fees.
    /// @param to Recipient address.
    /// @param amount USDT withdrawn.
    event FeesWithdrawn(address indexed to, uint256 amount);
    /// @notice Emitted when an admin performs an unrestricted treasury withdrawal.
    /// @param to Recipient address.
    /// @param amount USDT withdrawn.
    event TreasuryWithdrawn(address indexed to, uint256 amount);
    /// @notice Emitted when an admin re-parents a member in the referral tree.
    /// @param user The re-parented member.
    /// @param newParent The member's new referral sponsor.
    event AffiliateParentUpdated(address indexed user, address indexed newParent);
    /// @notice Emitted when an admin overrides a member's active flag.
    /// @param user The affected member.
    /// @param active The new active state.
    event ActivationAdjusted(address indexed user, bool active);
    /// @notice Emitted when the product rate is updated.
    /// @param rate The new LPNT-per-USDT rate (1e18-scaled).
    event ProductRateSet(uint256 rate);
    /// @notice Emitted on any parameter update handled by the shared admin setters.
    event ParamsUpdated();
    /// @notice Emitted when the pause flag is set.
    /// @param paused The new pause state.
    event PausedSet(bool paused);

    /* ---------------------------- Modifiers ---------------------------- */
    /// @dev Anti-spam guard: caller must be an EOA (tx.origin == msg.sender), at most one guarded call per
    ///      block, and at least `transactionCooldown` since the caller's last guarded call. Stamps both marks.
    // Anti-spam: EOA-only, one call/block, per-account cooldown.
    modifier antiSpam() {
        require(msg.sender == tx.origin, "CALLER_NOT_EOA");
        require(block.number > lastCallBlock[msg.sender], "ONE_CALL_PER_BLOCK");
        require(block.timestamp >= lastCallTime[msg.sender] + transactionCooldown, "TX_COOLDOWN");
        lastCallBlock[msg.sender] = block.number;
        lastCallTime[msg.sender] = block.timestamp;
        _;
    }

    /// @dev Blocks the guarded function while the contract is paused; reverts PAUSED otherwise.
    modifier whenNotPaused() {
        require(!paused, "PAUSED");
        _;
    }

    /* --------------------------- Constructor --------------------------- */
    /// @notice Deploy the plan: hardcodes USDT and LPNT, sets the deployer as owner/root/systemWallet, and
    ///         seeds the always-active root anchor at the top of both structures.
    /// @dev USDT/LPNT are pinned to fixed BSC addresses; validates the default split via _requireValidSplit.
    constructor() Ownable(msg.sender) {
        usdt = IERC20(address(0x55d398326f99059fF775485246999027B3197955));
        lpnt = IERC20(address(0x22456a4cc697aace2849280230Ab58266b54c999)); // deployed LPN TOKEN (BSC)

        root = msg.sender;
        systemWallet = msg.sender;   // default operator wallet; admin can repoint via setSystemFee
        isUser[root] = true;
        isAdmin[root] = true;
        isActivated[root] = true;   // root is the always-active anchor
        _hasLineSlot[root] = true;  // root anchors the one-line (root.line == address(0))
        lineTail = root;            // the first real activator's line points to root
        totalUsers = 1;

        _requireValidSplit();
    }

    /* ==================================================================== */
    /*                            USER — JOIN / PAY                          */
    /* ==================================================================== */

    /// @notice Register into the referral tree under `sponsor` (free — the 70 USDT is paid at activation).
    /// @param sponsor An existing registered member to sponsor the caller; cannot be the caller.
    /// @dev antiSpam + whenNotPaused. Reverts ALREADY_REGISTERED / SPONSOR_NOT_FOUND / SELF_SPONSOR.
    function register(address sponsor) external antiSpam whenNotPaused {
        require(!isUser[msg.sender], "ALREADY_REGISTERED");
        require(isUser[sponsor], "SPONSOR_NOT_FOUND");
        require(sponsor != msg.sender, "SELF_SPONSOR");

        isUser[msg.sender] = true;
        _affiliate[msg.sender].referral = sponsor;
        _addChild(sponsor, msg.sender);
        totalUsers += 1;

        emit Registered(msg.sender, sponsor);
    }

    /// @notice Deposit USDT into your withdrawable `walletBalance` (used to pay for activation). Must be at
    ///         least one entry package (re-activation from earned balance needs no new deposit).
    /// @param amount USDT to deposit; must be >= entryPackageA (the smallest tier). Requires prior approval.
    /// @dev antiSpam + nonReentrant + whenNotPaused. Pulls USDT via transferFrom and stamps lastWithdraw so
    ///      freshly deposited funds can't be flash-cycled out. Reverts NOT_REGISTERED / BELOW_MIN_DEPOSIT.
    function deposit(uint256 amount) external antiSpam nonReentrant whenNotPaused {
        require(isUser[msg.sender], "NOT_REGISTERED");
        require(amount >= entryPackageA, "BELOW_MIN_DEPOSIT"); // at least the smallest tier
        _safeTransferFrom(msg.sender, address(this), amount);
        walletBalance[msg.sender] += amount;
        // Stamp the withdraw cooldown so freshly deposited funds can't be flash-cycled straight back out.
        lastWithdraw[msg.sender] = block.timestamp;
        emit Deposited(msg.sender, amount);
    }

    /// @notice Is `amount` one of the three entry tiers?
    /// @param amount USDT amount to test.
    /// @return True if `amount` equals entryPackageA, entryPackageB, or entryPackageC.
    function isEntryPackage(uint256 amount) public view returns (bool) {
        return amount == entryPackageA || amount == entryPackageB || amount == entryPackageC;
    }

    /// @notice The cap top-up for an entry of `amount` (capBps of amount → 400% = 4× by default).
    /// @param amount The entry tier.
    /// @return The earnings-cap headroom granted for that entry (amount * capBps / BPS).
    function capFor(uint256 amount) public view returns (uint256) {
        return (amount * capBps) / BPS;
    }

    /// @notice Pay one of the entry tiers (`amount`) from `walletBalance`. First call assigns your permanent
    ///         one-line slot; later calls (after a cap deactivation) are re-entries that keep the same slot —
    ///         and may pick a different tier. All 8 allocations + the cap top-up scale with `amount`.
    /// @param amount The entry tier to activate at; must be a valid package and <= your walletBalance.
    /// @dev antiSpam + nonReentrant + whenNotPaused. Deducts `amount`, tops up cappingBalance by capFor(amount),
    ///      sets isActivated, then runs _distribute. Reverts NOT_REGISTERED / ALREADY_ACTIVE / BAD_PACKAGE /
    ///      INSUFFICIENT_BALANCE. Emits Activated.
    function activate(uint256 amount) external antiSpam nonReentrant whenNotPaused {
        require(isUser[msg.sender], "NOT_REGISTERED");
        require(!isActivated[msg.sender], "ALREADY_ACTIVE");
        require(isEntryPackage(amount), "BAD_PACKAGE");
        require(walletBalance[msg.sender] >= amount, "INSUFFICIENT_BALANCE");

        walletBalance[msg.sender] -= amount;

        bool reentry = _hasLineSlot[msg.sender];
        if (!reentry) {
            // First activation: append to the global one-line.
            _affiliate[msg.sender].line = lineTail;
            lineTail = msg.sender;
            _hasLineSlot[msg.sender] = true;
        }

        // Record the tier and top up the cap by capBps of the chosen amount (400% = 4× by default).
        activePackage[msg.sender] = amount;
        cappingBalance[msg.sender] += capFor(amount);
        isActivated[msg.sender] = true;
        activationCount[msg.sender] += 1;

        _distribute(msg.sender, amount);

        emit Activated(msg.sender, amount, activationCount[msg.sender], reentry);
    }

    /// @notice Claim one cashback chunk — exactly `cashBackClaimBps` of YOUR active tier (20% → 14/20/40 for
    ///         a 70/100/200 tier), sent to your wallet. Requires that much accrued cashBack; deducts the exact amount.
    /// @dev antiSpam + nonReentrant + whenNotPaused. Chunk size = cashBackClaimAmount(msg.sender). Reverts
    ///      NOT_REGISTERED / NO_ACTIVE_PACKAGE / INSUFFICIENT_CASHBACK / TREASURY_LOW. Emits CashBackClaimed.
    function claimCashBack() external antiSpam nonReentrant whenNotPaused {
        require(isUser[msg.sender], "NOT_REGISTERED");
        uint256 amount = cashBackClaimAmount(msg.sender);
        require(amount > 0, "NO_ACTIVE_PACKAGE");
        require(cashBack[msg.sender] >= amount, "INSUFFICIENT_CASHBACK");
        require(usdt.balanceOf(address(this)) >= amount, "TREASURY_LOW");

        cashBack[msg.sender] -= amount;
        _safeTransfer(msg.sender, amount);
        emit CashBackClaimed(msg.sender, amount, cashBack[msg.sender]);
    }

    /// @notice Redeem your accrued Product allocation as LPNT. Delivery is deferred to here (instead of at
    ///         activation) so activate() stays cheap. Best-effort via _deliverProduct: LPNT from the in-contract
    ///         reserve, else a USDT→LPNT swap. If neither is available the call reverts and your balance is kept
    ///         (retry once the reserve is topped up or the swap pool is live).
    /// @dev antiSpam + nonReentrant + whenNotPaused. Zeroes tokenBalance before delivery (CEI); reverts
    ///      TOKEN_UNAVAILABLE (restoring the balance) if undeliverable. Reverts NO_TOKEN_BALANCE / NOT_REGISTERED.
    function withdrawToken() external antiSpam nonReentrant whenNotPaused {
        require(isUser[msg.sender], "NOT_REGISTERED");
        uint256 amount = tokenBalance[msg.sender];
        require(amount > 0, "NO_TOKEN_BALANCE");

        tokenBalance[msg.sender] = 0;                                    // effect before interactions (CEI)
        require(_deliverProduct(msg.sender, amount), "TOKEN_UNAVAILABLE"); // reverts (keeps balance) if undeliverable
        emit TokenWithdrawn(msg.sender, amount);
    }

    /// @notice Withdraw USDT from your walletBalance. 24h cooldown; a `withdrawFeeBps` processing fee is the
    ///         user's only deduction (net = amount − fee). Out of that fee, a flat `systemFee` (clamped to the
    ///         fee, so it never increases the user's deduction) is routed to `systemWallet` as an operator cut;
    ///         the remainder accrues to collectedFees.
    /// @param amount USDT to withdraw; must be >= minWithdraw and <= your walletBalance.
    /// @dev antiSpam + nonReentrant + whenNotPaused. Enforces withdrawCooldown. Reverts BELOW_MIN_WITHDRAW /
    ///      INSUFFICIENT_BALANCE / WITHDRAW_COOLDOWN. Emits Withdrawn.
    function withdraw(uint256 amount) external antiSpam nonReentrant whenNotPaused {
        require(amount >= minWithdraw, "BELOW_MIN_WITHDRAW");
        require(walletBalance[msg.sender] >= amount, "INSUFFICIENT_BALANCE");
        require(block.timestamp >= lastWithdraw[msg.sender] + withdrawCooldown, "WITHDRAW_COOLDOWN");

        walletBalance[msg.sender] -= amount;
        lastWithdraw[msg.sender] = block.timestamp;

        uint256 fee = (amount * withdrawFeeBps) / BPS;       // user's only deduction
        uint256 sysFee = systemFee <= fee ? systemFee : fee; // carve-out, capped at the actual fee (no underflow)
        uint256 net = amount - fee;
        collectedFees += fee - sysFee;                       // remainder of the fee stays withdrawable

        _safeTransfer(msg.sender, net);
        if (sysFee > 0) _safeTransfer(systemWallet, sysFee); // flat operator cut → systemWallet
        emit Withdrawn(msg.sender, net, fee);
    }

    /* ==================================================================== */
    /*                       INTERNAL — DISTRIBUTION                         */
    /* ==================================================================== */

    /// @dev Splits one entry of `amount` USDT (the chosen tier) across the eight allocations. Capped bonuses
    ///      (Referral / Generation / Leaders / Cashback) flow through _payCapped; the rest credit pools directly.
    /// @param activator The member whose activation is being distributed.
    /// @param amount The entry tier being distributed.
    function _distribute(address activator, uint256 amount) internal {
        address sponsor = _affiliate[activator].referral;

        // 1) Referral → direct sponsor (capped; the uncapped remainder is booked to profit).
        uint256 refAmt = (amount * referralBps) / BPS;
        if (refAmt > 0) _payCappedToProfit(sponsor, refAmt, K_REFERRAL, activator);

        // 2) Generation (one-line) + 3) Leaders (matching) — single pass up the line.
        _payGenerationAndLeaders(activator, amount);

        // 4) Cashback → sponsor (CAPPED, routed to cashBack not walletBalance). Overflow / no sponsor → profit.
        uint256 cashBackAmt = (amount * cashBackBps) / BPS;
        if (cashBackAmt > 0) {
            if (sponsor != address(0)) _payCappedToProfit(sponsor, cashBackAmt, K_CASHBACK, activator);
            else profitBalance += cashBackAmt;
        }

        // 5) Incentive → global pool.
        incentiveBalance += (amount * incentiveBps) / BPS;

        // 8) Profit → global pool.
        profitBalance += (amount * profitBps) / BPS;

        // 6) Product — ACCRUE the allocation to the buyer; LPNT is delivered later via withdrawToken. No token
        //    balanceOf/transfer/swap here, so activation stays cheap and can never revert on token issues.
        uint256 productAmt = (amount * productBps) / BPS;
        if (productAmt > 0) {
            tokenBalance[activator] += productAmt;
            emit ProductAccrued(activator, productAmt);
        }

        // 7) Liquidity — the one remaining external call (route → retain), never reverts (CEI: interactions last).
        uint256 liqAmt = (amount * liquidityBps) / BPS;
        if (liqAmt > 0) _routeLiquidity(liqAmt);
    }

    /// @dev Deliver `productAmt` (USDT) worth of Product LPNT to `to`, best-effort. Called only from
    ///      withdrawToken when a member redeems their accrued tokenBalance. Returns whether LPNT was delivered:
    ///      1) RESERVE: if the in-contract LPNT reserve covers it, send from reserve and retain the USDT → true.
    ///      2) SWAP: else if a manager + initialized pool exist, swap USDT→LPNT to the buyer (USDT leaves) → true.
    ///      3) else deliver nothing → false (withdrawToken reverts on false, so the member keeps their balance).
    /// @param to The buyer receiving the LPNT.
    /// @param productAmt The Product allocation (USDT terms) to settle; lpntOut = productAmt * productRate / 1e18.
    /// @return True if LPNT was delivered (reserve or swap); false if nothing was available.
    function _deliverProduct(address to, uint256 productAmt) internal returns (bool) {
        if (productAmt == 0) return false;
        uint256 lpntOut = (productAmt * productRate) / 1e18;

        // 1) reserve
        if (lpntOut > 0 && lpnt.balanceOf(address(this)) >= lpntOut) {
            productBalance += productAmt;                 // retain USDT (effect before the transfer)
            _safeTransferToken(lpnt, to, lpntOut);
            emit ProductDelivered(to, productAmt, lpntOut);
            return true;
        }

        // 2) swap via the LP manager (spends the USDT; buyer gets market-rate LPNT)
        ILiquidity lp = liquidity;
        if (lpntOut > 0 && address(lp) != address(0) && lp.TOKENID() != 0) {
            _safeApprove(usdt, address(lp), productAmt);
            try lp.swapUSDTToLPNT(productAmt, uint24(liquiditySlippageBps), to, block.timestamp + 600)
                returns (uint256 got) {
                emit ProductSwapped(to, productAmt, got); // USDT left; NOT retained
                return true;
            } catch {
                _safeApprove(usdt, address(lp), 0);        // clear dangling allowance
            }
        }

        // 3) neither reserve nor an initialized swap available — deliver nothing.
        return false;
    }

    /// @dev Route `amount` USDT to the configured liquidity manager via addLiquidityUSDT (approve then call).
    ///      Best-effort: if no manager is set, its position is uninitialized, the call reverts, or it returns
    ///      0, the USDT stays in `liquidityBalance` (admin can withdraw it to the LP wallet or flushLiquidity
    ///      to retry). USDT never leaves the contract on failure. Called only from _distribute / flush paths,
    ///      which run under `nonReentrant`.
    /// @param amount USDT to route to the LP manager (or retain in liquidityBalance on failure).
    function _routeLiquidity(uint256 amount) internal {
        ILiquidity lp = liquidity;
        if (address(lp) != address(0) && lp.TOKENID() != 0) {
            _safeApprove(usdt, address(lp), amount);
            try lp.addLiquidityUSDT(amount, uint24(liquiditySlippageBps), block.timestamp + 600) returns (uint256 lpAdded) {
                if (lpAdded > 0) {
                    emit LiquidityRouted(amount, lpAdded);
                    return;
                }
                emit LiquidityRoutingFailed(amount, "returned zero");
            } catch Error(string memory reason) {
                emit LiquidityRoutingFailed(amount, reason);
            } catch {
                emit LiquidityRoutingFailed(amount, "unknown");
            }
            _safeApprove(usdt, address(lp), 0); // clear the dangling allowance after a failed attempt
        }
        liquidityBalance += amount; // fallback: retain in the pool
    }

    /// @dev Generation: walk up the one-line paying `share` to each ACTIVE member (auto-compress skips
    ///      inactive), up to `generationLevels` levels, bounded by `maxScan`. Leaders: for each such member,
    ///      match `matchShare` (leadersMatchBps of the share) to that member's DIRECT referral sponsor. Both
    ///      payments are capped at the recipient's remaining cap room; the uncapped remainder — and any
    ///      unfilled levels — is booked to profit. No roll-up (distribute only up to the cap).
    /// @param activator The member whose activation triggers the walk (starting from their one-line predecessor).
    /// @param amount The entry tier; the per-level generation share is amount * generationBpsPerLevel / BPS.
    function _payGenerationAndLeaders(address activator, uint256 amount) internal {
        uint256 share = (amount * generationBpsPerLevel) / BPS;
        uint256 targetLevels = generationLevels;
        if (share == 0 || targetLevels == 0) return;

        uint256 matchShare = (share * leadersMatchBps) / BPS;
        uint256 levelsPaid;
        uint256 scans;
        uint256 maxS = maxScan;
        address cursor = _affiliate[activator].line;

        while (levelsPaid < targetLevels && cursor != address(0) && scans < maxS) {
            unchecked { scans++; }
            if (isActivated[cursor]) {
                _payCappedToProfit(cursor, share, K_GENERATION, activator);                      // generation
                _payCappedToProfit(_affiliate[cursor].referral, matchShare, K_LEADERS, cursor);  // leaders match
                unchecked { levelsPaid++; }
            }
            cursor = _affiliate[cursor].line;
        }

        // Unfilled levels (line ran out / scan bound) → generation + matching leaders booked to profit.
        uint256 unfilled = targetLevels - levelsPaid;
        if (unfilled > 0) {
            uint256 genRes = unfilled * share;
            uint256 leadRes = unfilled * matchShare;
            profitBalance += genRes + leadRes;
            emit Residual(K_GENERATION, genRes);
            if (leadRes > 0) emit Residual(K_LEADERS, leadRes);
        }
    }

    /// @dev Pay up to `amount` of capped income to `member` via _payCapped (nothing if inactive/absent);
    ///      the uncapped remainder is booked to profit. Distribute only up to the cap — no roll-up.
    /// @param member The intended recipient.
    /// @param amount The capped income to attempt to pay.
    /// @param kind Bonus kind (K_REFERRAL / K_GENERATION / K_LEADERS / K_CASHBACK).
    /// @param from The member whose activation generated this income (event attribution).
    function _payCappedToProfit(address member, uint256 amount, uint8 kind, address from) internal {
        uint256 over = _payCapped(member, amount, kind, from);
        if (over > 0) {
            profitBalance += over;
            emit Residual(kind, over);
        }
    }

    /// @dev Credit up to `amount` of CAPPED income (cashback / referral / generation / leaders) to `member`,
    ///      bounded by their remaining cappingBalance. Pays nothing to an inactive member (cappingBalance 0).
    ///      Root is cap-exempt (absorbs fully, never deactivates). Draws cappingBalance down by the paid
    ///      amount and deactivates the member the instant it reaches 0. The paid portion goes to `cashBack`
    ///      for K_CASHBACK, else to withdrawable `walletBalance`. Returns the unpaid remainder.
    /// @param member The recipient (may be address(0) or inactive, in which case nothing is paid).
    /// @param amount The capped income to attempt to credit.
    /// @param kind Bonus kind; K_CASHBACK routes to cashBack, others to walletBalance (and bump trackers).
    /// @param from The member whose activation generated this income (event attribution).
    /// @return The unpaid remainder (amount minus the portion actually credited).
    function _payCapped(address member, uint256 amount, uint8 kind, address from) internal returns (uint256) {
        if (amount == 0 || member == address(0)) return amount;
        if (!isActivated[member]) return amount; // inactive: absorbs nothing; caller books it to profit

        uint256 pay;
        if (member == root) {
            pay = amount;                         // cap-exempt anchor
        } else {
            uint256 room = cappingBalance[member];
            pay = amount <= room ? amount : room;
            cappingBalance[member] = room - pay;
        }

        if (kind == K_CASHBACK) {
            cashBack[member] += pay;
            emit CashBackAccrued(member, pay, cashBack[member]);
        } else {
            walletBalance[member] += pay;
            _bumpTracker(member, pay, kind);
            emit BonusPaid(member, from, kind, pay);
        }

        if (member != root && cappingBalance[member] == 0) {
            isActivated[member] = false;
            emit Deactivated(member);
        }
        return amount - pay;
    }

    /// @dev Add `amt` to the member's lifetime tracker for the given non-cashback bonus kind.
    /// @param m The member whose tracker is bumped.
    /// @param amt The income amount to add.
    /// @param kind Bonus kind: K_REFERRAL → referralBalance, K_GENERATION → generationBalance, else leadersBalance.
    function _bumpTracker(address m, uint256 amt, uint8 kind) internal {
        if (kind == K_REFERRAL) referralBalance[m] += amt;
        else if (kind == K_GENERATION) generationBalance[m] += amt;
        else leadersBalance[m] += amt;
    }

    /* ==================================================================== */
    /*                               VIEWS                                  */
    /* ==================================================================== */

    /// @notice A member's claimable cashback balance right now.
    /// @param user The member to query.
    /// @return The member's current cashBack balance (USDT).
    function cashBackAvailable(address user) external view returns (uint256) {
        return cashBack[user];
    }

    /// @notice The exact USDT a single claimCashBack() pays `user` — cashBackClaimBps of their active tier
    ///         (0 if they've never activated).
    /// @param user The member to query.
    /// @return The per-claim cashback amount (activePackage[user] * cashBackClaimBps / BPS).
    function cashBackClaimAmount(address user) public view returns (uint256) {
        return (activePackage[user] * cashBackClaimBps) / BPS;
    }

    /// @notice A member's sponsor, one-line predecessor, and direct-referral count.
    /// @param user The member to query.
    /// @return referral The member's referral-tree sponsor.
    /// @return line The member's one-line predecessor.
    /// @return directCount The number of direct referrals (children) the member has.
    function getAffiliate(address user) external view returns (address referral, address line, uint256 directCount) {
        Affiliate storage a = _affiliate[user];
        return (a.referral, a.line, a.children.length);
    }

    /// @notice Paginated list of a member's direct referrals (children in the referral tree).
    /// @param user The member whose children to list.
    /// @param offset Starting index into the children array.
    /// @param limit Maximum number of entries to return.
    /// @return result The slice of child addresses (empty if offset is past the end).
    /// @return total The total number of children.
    function getChildren(address user, uint256 offset, uint256 limit)
        external view returns (address[] memory result, uint256 total)
    {
        address[] storage ch = _affiliate[user].children;
        total = ch.length;
        if (offset >= total) return (new address[](0), total);
        uint256 end = offset + limit > total ? total : offset + limit;
        result = new address[](end - offset);
        for (uint256 i = 0; i < result.length; i++) result[i] = ch[offset + i];
    }

    /// @notice Aggregated per-member snapshot returned by getUser for frontends.
    struct UserView {
        bool registered;
        bool active;
        address sponsor;
        address line;
        uint256 directCount;
        uint256 activationCount;
        uint256 walletBalance;
        uint256 activePackage;  // tier of the current cycle (70/100/200; 0 = inactive/never)
        uint256 cappingBalance; // remaining earnable this cycle
        uint256 earningsCap;    // the per-cycle max = capFor(activePackage) (4× the tier)
        uint256 cashBackAvailable;
        uint256 referralBalance;
        uint256 generationBalance;
        uint256 leadersBalance;
    }

    /// @notice One-call dashboard snapshot for a frontend.
    /// @param user The member to summarize.
    /// @return v A UserView with registration/active flags, genealogy, balances, cap state, and lifetime income.
    function getUser(address user) external view returns (UserView memory v) {
        Affiliate storage a = _affiliate[user];
        v.registered = isUser[user];
        v.active = isActivated[user];
        v.sponsor = a.referral;
        v.line = a.line;
        v.directCount = a.children.length;
        v.activationCount = activationCount[user];
        v.walletBalance = walletBalance[user];
        v.activePackage = activePackage[user];
        v.cappingBalance = cappingBalance[user];
        v.earningsCap = capFor(activePackage[user]);
        v.cashBackAvailable = cashBack[user];
        v.referralBalance = referralBalance[user];
        v.generationBalance = generationBalance[user];
        v.leadersBalance = leadersBalance[user];
    }

    /// @notice The contract's live USDT balance — the funds on hand (source of truth for withdrawals).
    /// @return The contract's USDT balance.
    function treasury() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /// @notice The LPNT reserve remaining for Product distributions.
    /// @return The contract's LPNT balance.
    function lpntReserve() external view returns (uint256) {
        return lpnt.balanceOf(address(this));
    }

    /* ==================================================================== */
    /*                          ADMIN — GENEALOGY                           */
    /* ==================================================================== */

    /// @notice Correct a user's referral sponsor (migration). Guards against cycles. Root can't be re-parented.
    /// @param user The member to re-parent; must be registered and not root.
    /// @param newParent The member's new referral sponsor; must be registered, not `user`, and not the current parent.
    /// @dev onlyAdmin. Walks newParent to root to reject cycles (CIRCULAR_PARENT), then moves the child link.
    ///      Reverts USER_NOT_FOUND / CANNOT_REPARENT_ROOT / NEW_PARENT_NOT_FOUND / SELF_PARENT / ALREADY_SAME_PARENT.
    function updateAffiliateParent(address user, address newParent) external onlyAdmin {
        require(isUser[user], "USER_NOT_FOUND");
        require(user != root, "CANNOT_REPARENT_ROOT");
        require(isUser[newParent], "NEW_PARENT_NOT_FOUND");
        require(newParent != user, "SELF_PARENT");
        require(newParent != _affiliate[user].referral, "ALREADY_SAME_PARENT");

        // Cycle check: user must not be an ancestor of newParent. The referral tree is acyclic (register adds
        // leaves; this guard blocks cycles), so the walk-to-root always terminates.
        address cursor = newParent;
        while (cursor != address(0)) {
            if (cursor == user) revert("CIRCULAR_PARENT");
            cursor = _affiliate[cursor].referral;
        }

        address oldParent = _affiliate[user].referral;
        if (oldParent != address(0)) _removeChild(oldParent, user);
        _affiliate[user].referral = newParent;
        _addChild(newParent, user);
        emit AffiliateParentUpdated(user, newParent);
    }

    /// @dev Append `child` to `parent`'s children with O(1)-removable index bookkeeping.
    /// @param parent The parent whose children array grows.
    /// @param child The child to append.
    function _addChild(address parent, address child) internal {
        address[] storage ch = _affiliate[parent].children;
        ch.push(child);
        _childIndexPlus1[parent][child] = ch.length; // stores index+1
        totalDirects[parent] += 1;
    }

    /// @dev Remove `child` from `parent`'s children in O(1) via the index map (swap-and-pop). No-op if absent.
    /// @param parent The parent whose children array shrinks.
    /// @param child The child to remove.
    function _removeChild(address parent, address child) internal {
        uint256 idxPlus1 = _childIndexPlus1[parent][child];
        if (idxPlus1 == 0) return; // not present
        address[] storage ch = _affiliate[parent].children;
        uint256 idx = idxPlus1 - 1;
        uint256 last = ch.length - 1;
        if (idx != last) {
            address moved = ch[last];
            ch[idx] = moved;
            _childIndexPlus1[parent][moved] = idx + 1; // fix the moved child's index
        }
        ch.pop();
        _childIndexPlus1[parent][child] = 0;
        if (totalDirects[parent] > 0) totalDirects[parent] -= 1;
    }

    /// @notice Admin override of a member's active flag (promos/migration/support). Does not move USDT.
    ///         When activating, `amount` is the granted tier (must be a valid package) — sets activePackage and
    ///         tops up the cap by capFor(amount). `amount` is ignored when deactivating.
    /// @param user The member to adjust; must be registered and not root.
    /// @param active True to activate (grant a fresh cap), false to deactivate (zero the cap).
    /// @param amount The granted entry tier when activating (must be a valid package); ignored when deactivating.
    /// @dev onlyAdmin. Assigns a one-line slot on first activation. Reverts USER_NOT_FOUND / ROOT_ALWAYS_ACTIVE /
    ///      ALREADY_ACTIVE / BAD_PACKAGE. Emits ActivationAdjusted.
    function setActivation(address user, bool active, uint256 amount) external onlyAdmin {
        require(isUser[user], "USER_NOT_FOUND");
        require(user != root, "ROOT_ALWAYS_ACTIVE");
        if (active) {
            require(!isActivated[user], "ALREADY_ACTIVE"); // never reset an active member's cap mid-cycle
            require(isEntryPackage(amount), "BAD_PACKAGE");
            isActivated[user] = true;
            activePackage[user] = amount;
            cappingBalance[user] = capFor(amount);   // fresh cap headroom for the granted tier
            if (!_hasLineSlot[user]) {
                _affiliate[user].line = lineTail;
                lineTail = user;
                _hasLineSlot[user] = true;
            }
        } else {
            isActivated[user] = false;
            cappingBalance[user] = 0;               // deactivated => no headroom (matches the natural invariant)
        }
        emit ActivationAdjusted(user, active);
    }

    /* ==================================================================== */
    /*                          ADMIN — PARAMETERS                          */
    /* ==================================================================== */

    /// @notice Set the three entry tiers (strictly increasing). Only settable pre-launch (before anyone
    ///         registers) so cap sizes and cashback claim chunks can't desync against already-accrued balances.
    /// @param a New entry tier A (smallest); must be > 0.
    /// @param b New entry tier B; must be > a.
    /// @param c New entry tier C (largest); must be > b.
    /// @dev onlyAdmin. Reverts USERS_EXIST unless only root is registered, and BAD_PACKAGES if not strictly
    ///      increasing. Emits ParamsUpdated.
    function setPackages(uint256 a, uint256 b, uint256 c) external onlyAdmin {
        require(totalUsers == 1, "USERS_EXIST"); // only root exists
        require(a > 0 && b > a && c > b, "BAD_PACKAGES");
        entryPackageA = a;
        entryPackageB = b;
        entryPackageC = c;
        emit ParamsUpdated();
    }

    /// @notice Set the eight allocation weights (bps). Must sum (with the leaders match) to exactly 100%.
    /// @param _referralBps Referral weight (bps).
    /// @param _generationBpsPerLevel Generation weight per one-line level (bps).
    /// @param _generationLevels Number of one-line levels paid; must be 1..50 and <= maxScan.
    /// @param _leadersMatchBps Leaders match rate applied to each generation share (bps).
    /// @param _cashBackBps Cashback weight (bps).
    /// @param _incentiveBps Incentive weight (bps).
    /// @param _productBps Product weight (bps).
    /// @param _liquidityBps Liquidity weight (bps).
    /// @param _profitBps Profit weight (bps).
    /// @dev onlyAdmin. Reverts BAD_LEVELS / LEVELS_GT_SCAN, then _requireValidSplit enforces the 100% sum
    ///      (SPLIT_NOT_100). Emits ParamsUpdated.
    function setSplit(
        uint256 _referralBps,
        uint256 _generationBpsPerLevel,
        uint256 _generationLevels,
        uint256 _leadersMatchBps,
        uint256 _cashBackBps,
        uint256 _incentiveBps,
        uint256 _productBps,
        uint256 _liquidityBps,
        uint256 _profitBps
    ) external onlyAdmin {
        require(_generationLevels > 0 && _generationLevels <= 50, "BAD_LEVELS");
        require(_generationLevels <= maxScan, "LEVELS_GT_SCAN");
        referralBps = _referralBps;
        generationBpsPerLevel = _generationBpsPerLevel;
        generationLevels = _generationLevels;
        leadersMatchBps = _leadersMatchBps;
        cashBackBps = _cashBackBps;
        incentiveBps = _incentiveBps;
        productBps = _productBps;
        liquidityBps = _liquidityBps;
        profitBps = _profitBps;
        _requireValidSplit();
        emit ParamsUpdated();
    }

    /// @notice Set the earnings-cap multiplier applied to each entry.
    /// @param _capBps New cap in basis points; must be 10000..100000 (100%..1000%).
    /// @dev onlyAdmin. Reverts BAD_CAP outside the bound. Emits ParamsUpdated.
    function setCapBps(uint256 _capBps) external onlyAdmin {
        require(_capBps >= BPS && _capBps <= 100_000, "BAD_CAP"); // 100%..1000% (upper bound avoids overflow)
        capBps = _capBps;
        emit ParamsUpdated();
    }

    /// @notice Set the withdraw processing fee, cooldown, and minimum withdrawal.
    /// @param _feeBps Processing fee (bps); hard-capped at 3000 (30%).
    /// @param _cooldown Minimum time between withdrawals; capped at 30 days.
    /// @param _minWithdraw Minimum withdrawal amount (USDT).
    /// @dev onlyAdmin. Reverts FEE_TOO_HIGH / COOLDOWN_TOO_LONG. Emits ParamsUpdated.
    function setWithdrawParams(uint256 _feeBps, uint256 _cooldown, uint256 _minWithdraw) external onlyAdmin {
        require(_feeBps <= 3000, "FEE_TOO_HIGH");        // hard cap 30%
        require(_cooldown <= 30 days, "COOLDOWN_TOO_LONG");
        withdrawFeeBps = _feeBps;
        withdrawCooldown = _cooldown;
        minWithdraw = _minWithdraw;
        emit ParamsUpdated();
    }

    /// @notice Set the flat system fee (USDT) carved from each withdrawal's processing fee, and the wallet that
    ///         receives it. The fee is clamped to the actual fee per withdraw, so it never increases the user's
    ///         deduction. `_systemWallet` must be non-zero.
    /// @param _systemFee New flat system fee (USDT); sanity-bounded at <= 100 USDT.
    /// @param _systemWallet Recipient of the carve-out; must be non-zero.
    /// @dev onlyAdmin. Reverts SYSTEM_FEE_TOO_HIGH / ZERO_SYSTEM_WALLET. Emits ParamsUpdated.
    function setSystemFee(uint256 _systemFee, address _systemWallet) external onlyAdmin {
        require(_systemFee <= 100e18, "SYSTEM_FEE_TOO_HIGH"); // sanity bound (≤ 100 USDT)
        require(_systemWallet != address(0), "ZERO_SYSTEM_WALLET");
        systemFee = _systemFee;
        systemWallet = _systemWallet;
        emit ParamsUpdated();
    }

    /// @notice Set the cashback claim size as a % of the entry package (each claimCashBack pays this much).
    /// @param _bps New claim fraction in basis points; must be in (0, 10000].
    /// @dev onlyAdmin. Reverts BAD_CLAIM_BPS out of range. Emits ParamsUpdated.
    function setCashBackClaimBps(uint256 _bps) external onlyAdmin {
        require(_bps > 0 && _bps <= BPS, "BAD_CLAIM_BPS");
        cashBackClaimBps = _bps;
        emit ParamsUpdated();
    }

    /// @notice Set the Product rate — LPNT delivered per 1 USDT of Product allocation (1e18-scaled).
    /// @param _rate New rate; bounded at <= 1e30 to avoid overflow in productAmt * productRate.
    /// @dev onlyAdmin. Reverts RATE_TOO_HIGH. Emits ProductRateSet.
    function setProductRate(uint256 _rate) external onlyAdmin {
        require(_rate <= 1e30, "RATE_TOO_HIGH"); // bound to avoid overflow in productAmt*productRate
        productRate = _rate;
        emit ProductRateSet(_rate);
    }

    /// @notice Set the external liquidity manager that receives the Liquidity allocation via addLiquidityUSDT.
    ///         address(0) disables on-chain routing — the allocation then accrues to liquidityBalance instead.
    /// @param manager The LP manager address (address(0) to disable routing).
    /// @dev onlyAdmin. Emits LiquiditySet.
    function setLiquidity(address manager) external onlyAdmin {
        liquidity = ILiquidity(manager);
        emit LiquiditySet(manager);
    }

    /// @notice Slippage (bps) passed to addLiquidityUSDT. Capped at 5000 (the manager rejects more).
    /// @param bps New slippage tolerance in basis points; must be <= 5000.
    /// @dev onlyAdmin. Reverts SLIPPAGE_TOO_HIGH. Emits ParamsUpdated.
    function setLiquiditySlippageBps(uint256 bps) external onlyAdmin {
        require(bps <= 5000, "SLIPPAGE_TOO_HIGH");
        liquiditySlippageBps = bps;
        emit ParamsUpdated();
    }

    /// @notice Set the gas-guard bound on one-line iterations during compress/roll-up walks.
    /// @param _maxScan New scan bound; must be >= generationLevels and <= 1000.
    /// @dev onlyAdmin. Reverts BAD_SCAN out of range. Emits ParamsUpdated.
    function setMaxScan(uint256 _maxScan) external onlyAdmin {
        require(_maxScan >= generationLevels && _maxScan <= 1000, "BAD_SCAN");
        maxScan = _maxScan;
        emit ParamsUpdated();
    }

    /// @notice Set the per-account cooldown between antiSpam-guarded calls.
    /// @param secs New cooldown in seconds; capped at 5 minutes.
    /// @dev onlyAdmin. Reverts COOLDOWN_TOO_LONG. Emits ParamsUpdated.
    function setTransactionCooldown(uint256 secs) external onlyAdmin {
        require(secs <= 5 minutes, "COOLDOWN_TOO_LONG");
        transactionCooldown = secs;
        emit ParamsUpdated();
    }

    /// @notice Pause or unpause the user-facing entry points.
    /// @param _paused True to pause, false to resume.
    /// @dev onlyAdmin. Emits PausedSet.
    function setPaused(bool _paused) external onlyAdmin {
        paused = _paused;
        emit PausedSet(_paused);
    }

    /// @dev Guarantees the eight allocations (with the leaders match) sum to exactly 100% of each entry.
    ///      Reverts SPLIT_NOT_100 otherwise. Called from the constructor and setSplit.
    function _requireValidSplit() internal view {
        uint256 genTotal = generationBpsPerLevel * generationLevels;
        uint256 leadersTotal = (genTotal * leadersMatchBps) / BPS;
        uint256 sum = referralBps + genTotal + leadersTotal
            + cashBackBps + incentiveBps + productBps + liquidityBps + profitBps;
        require(sum == BPS, "SPLIT_NOT_100");
    }

    /* ==================================================================== */
    /*                          ADMIN — TREASURY                            */
    /* ==================================================================== */

    /// @notice Withdraw USDT from the incentive pool to `to`.
    /// @param to Recipient address; must be non-zero.
    /// @param amount USDT to withdraw; must be <= incentiveBalance.
    /// @dev onlyAdmin + nonReentrant. Reverts ZERO_ADDRESS / EXCEEDS_INCENTIVE. Emits IncentiveWithdrawn.
    function withdrawIncentive(address to, uint256 amount) external onlyAdmin nonReentrant {
        require(to != address(0), "ZERO_ADDRESS");
        require(amount <= incentiveBalance, "EXCEEDS_INCENTIVE");
        incentiveBalance -= amount;
        _safeTransfer(to, amount);
        emit IncentiveWithdrawn(to, amount);
    }

    /// @notice Withdraw USDT from the liquidity fallback pool to `to` (e.g. to fund an off-chain LP wallet).
    /// @param to Recipient address; must be non-zero.
    /// @param amount USDT to withdraw; must be <= liquidityBalance.
    /// @dev onlyAdmin + nonReentrant. Reverts ZERO_ADDRESS / EXCEEDS_LIQUIDITY. Emits LiquidityWithdrawn.
    function withdrawLiquidity(address to, uint256 amount) external onlyAdmin nonReentrant {
        require(to != address(0), "ZERO_ADDRESS");
        require(amount <= liquidityBalance, "EXCEEDS_LIQUIDITY");
        liquidityBalance -= amount;
        _safeTransfer(to, amount);
        emit LiquidityWithdrawn(to, amount);
    }

    /// @notice Route up to `amount` of accrued `liquidityBalance` to the LP manager — the retry path for
    ///         allocations that fell back to the pool (manager unset at the time, or a transient failure).
    ///         Reverts the whole call (restoring the balance) if routing doesn't consume the funds.
    /// @param amount USDT to flush from liquidityBalance to the manager; must be <= liquidityBalance.
    /// @dev onlyAdmin + nonReentrant. Requires a ready manager (non-zero, TOKENID != 0). Reverts
    ///      EXCEEDS_LIQUIDITY / LP_NOT_READY / LP_RETURNED_ZERO. Emits LiquidityRouted.
    function flushLiquidity(uint256 amount) external onlyAdmin nonReentrant {
        require(amount <= liquidityBalance, "EXCEEDS_LIQUIDITY");
        ILiquidity lp = liquidity;
        require(address(lp) != address(0) && lp.TOKENID() != 0, "LP_NOT_READY");
        liquidityBalance -= amount;
        _safeApprove(usdt, address(lp), amount);
        uint256 lpAdded = lp.addLiquidityUSDT(amount, uint24(liquiditySlippageBps), block.timestamp + 600);
        require(lpAdded > 0, "LP_RETURNED_ZERO"); // reverts (restoring liquidityBalance) if nothing was added
        emit LiquidityRouted(amount, lpAdded);
    }

    /// @notice Withdraw USDT from the profit pool to `to`.
    /// @param to Recipient address; must be non-zero.
    /// @param amount USDT to withdraw; must be <= profitBalance.
    /// @dev onlyAdmin + nonReentrant. Reverts ZERO_ADDRESS / EXCEEDS_PROFIT. Emits ProfitWithdrawn.
    function withdrawProfit(address to, uint256 amount) external onlyAdmin nonReentrant {
        require(to != address(0), "ZERO_ADDRESS");
        require(amount <= profitBalance, "EXCEEDS_PROFIT");
        profitBalance -= amount;
        _safeTransfer(to, amount);
        emit ProfitWithdrawn(to, amount);
    }

    /// @notice Withdraw USDT retained from reserve-served Product redemptions to `to`.
    /// @param to Recipient address; must be non-zero.
    /// @param amount USDT to withdraw; must be <= productBalance.
    /// @dev onlyAdmin + nonReentrant. Reverts ZERO_ADDRESS / EXCEEDS_PRODUCT. Emits ProductWithdrawn.
    function withdrawProduct(address to, uint256 amount) external onlyAdmin nonReentrant {
        require(to != address(0), "ZERO_ADDRESS");
        require(amount <= productBalance, "EXCEEDS_PRODUCT");
        productBalance -= amount;
        _safeTransfer(to, amount);
        emit ProductWithdrawn(to, amount);
    }

    /// @notice Withdraw accrued withdraw processing fees to `to`.
    /// @param to Recipient address; must be non-zero.
    /// @param amount USDT to withdraw; must be <= collectedFees.
    /// @dev onlyAdmin + nonReentrant. Reverts ZERO_ADDRESS / EXCEEDS_FEES. Emits FeesWithdrawn.
    function withdrawFees(address to, uint256 amount) external onlyAdmin nonReentrant {
        require(to != address(0), "ZERO_ADDRESS");
        require(amount <= collectedFees, "EXCEEDS_FEES");
        collectedFees -= amount;
        _safeTransfer(to, amount);
        emit FeesWithdrawn(to, amount);
    }

    /// @notice Admin withdrawal bounded only by the contract's live USDT balance (fully-trusted-operator
    ///         model). ⚠ onlyAdmin — ANY admin (not only the owner) can move USDT up to the full balance,
    ///         including user walletBalances and cashBack backing. Keep the admin set minimal and on a
    ///         hardware wallet / multisig; prefer the pool-specific withdrawals above for routine revenue.
    /// @param to Recipient address; must be non-zero.
    /// @param amount USDT to withdraw; must be <= the contract's live USDT balance.
    /// @dev onlyAdmin + nonReentrant. Reverts ZERO_ADDRESS / EXCEEDS_BALANCE. Emits TreasuryWithdrawn.
    function withdrawTreasury(address to, uint256 amount) external onlyAdmin nonReentrant {
        require(to != address(0), "ZERO_ADDRESS");
        require(amount <= usdt.balanceOf(address(this)), "EXCEEDS_BALANCE");
        _safeTransfer(to, amount);
        emit TreasuryWithdrawn(to, amount);
    }

    /// @notice Withdraw un-distributed LPNT reserve (admin). Cannot exceed the reserve on hand.
    /// @param to Recipient address; must be non-zero.
    /// @param amount LPNT to withdraw; must be <= the contract's LPNT balance.
    /// @dev onlyAdmin + nonReentrant. Reverts ZERO_ADDRESS / EXCEEDS_RESERVE.
    function withdrawLpnt(address to, uint256 amount) external onlyAdmin nonReentrant {
        require(to != address(0), "ZERO_ADDRESS");
        require(amount <= lpnt.balanceOf(address(this)), "EXCEEDS_RESERVE");
        _safeTransferToken(lpnt, to, amount);
    }

    /// @notice Rescue non-USDT / non-LPNT tokens sent by mistake.
    /// @param token The ERC20 to rescue; cannot be USDT or LPNT (use the dedicated withdrawals for those).
    /// @param to Recipient address; must be non-zero.
    /// @param amount Token amount to transfer out.
    /// @dev onlyAdmin + nonReentrant. Reverts USE_WITHDRAW_TREASURY / USE_WITHDRAW_LPNT / ZERO_ADDRESS.
    function rescueToken(address token, address to, uint256 amount) external onlyAdmin nonReentrant {
        require(token != address(usdt), "USE_WITHDRAW_TREASURY");
        require(token != address(lpnt), "USE_WITHDRAW_LPNT");
        require(to != address(0), "ZERO_ADDRESS");
        _safeTransferToken(IERC20(token), to, amount);
    }

    /// @notice Remove an admin. Root cannot be removed from admin. Owner-only. Overrides AdminOwnable.
    /// @param adminAddress Address to demote; must be non-zero, not root, and currently an admin.
    /// @dev Reverts ZERO_ADDRESS / CANNOT_REMOVE_ROOT_ADMIN / NOT_ADMIN. Emits AdminRemoved.
    function removeAdmin(address adminAddress) external override onlyOwner {
        require(adminAddress != address(0), "ZERO_ADDRESS");
        require(adminAddress != root, "CANNOT_REMOVE_ROOT_ADMIN");
        require(isAdmin[adminAddress], "NOT_ADMIN");
        isAdmin[adminAddress] = false;
        emit AdminRemoved(adminAddress);
    }

    /* ==================================================================== */
    /*                       INTERNAL — SAFE ERC20                          */
    /* ==================================================================== */

    /// @dev Transfer `amount` USDT from the contract to `to` via the tolerant token wrapper.
    /// @param to Recipient address.
    /// @param amount USDT amount to send.
    function _safeTransfer(address to, uint256 amount) internal {
        _safeTransferToken(usdt, to, amount);
    }

    /// @dev Pull `amount` USDT from `from` to `to`, tolerating tokens that return no data.
    /// @param from Source address (must have approved this contract).
    /// @param to Recipient address.
    /// @param amount USDT amount to pull.
    /// @dev Reverts NOT_CONTRACT if USDT has no code, or TRANSFER_FROM_FAILED on a failed/false return.
    function _safeTransferFrom(address from, address to, uint256 amount) internal {
        require(address(usdt).code.length > 0, "NOT_CONTRACT");
        (bool ok, bytes memory data) = address(usdt).call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FROM_FAILED");
    }

    /// @dev Transfer `amount` of an arbitrary ERC20 to `to`, tolerating tokens that return no data.
    /// @param token The ERC20 to transfer.
    /// @param to Recipient address.
    /// @param amount Token amount to send.
    /// @dev Reverts NOT_CONTRACT if the token has no code, or TRANSFER_FAILED on a failed/false return.
    function _safeTransferToken(IERC20 token, address to, uint256 amount) internal {
        require(address(token).code.length > 0, "NOT_CONTRACT");
        (bool ok, bytes memory data) = address(token).call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FAILED");
    }

    /// @dev Approve `spender` for `amount` of `token`, tolerating tokens that return no data.
    /// @param token The ERC20 to approve.
    /// @param spender Address granted the allowance (the LP manager).
    /// @param amount Allowance amount.
    /// @dev Reverts NOT_CONTRACT if the token has no code, or APPROVE_FAILED on a failed/false return.
    function _safeApprove(IERC20 token, address spender, uint256 amount) internal {
        require(address(token).code.length > 0, "NOT_CONTRACT");
        (bool ok, bytes memory data) = address(token).call(
            abi.encodeWithSelector(IERC20.approve.selector, spender, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "APPROVE_FAILED");
    }
}
