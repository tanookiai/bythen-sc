// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "hardhat/console.sol";

error HeapEmpty();
error HeapAlreadyInitialized();
error HeapOutOfBounds();

contract RaffleBidHeap {

    struct Bid {
        address bidder;
        uint128 price;
        uint64 timestamp;
        bool inHeap;
    }

    struct Heap {
        // These variables should never be directly accessed by users of the library: interactions must be restricted to
        // the library's function. As of Solidity v0.5.2, this cannot be enforced, though there is a proposal to add
        // this feature: see https://github.com/ethereum/solidity/issues/4637

        uint256 _maxCapacity;
        address[] _tree;
    }

    Heap private _heap;
    mapping(address => RaffleBidHeap.Bid) internal userBids;

    constructor(uint256 cap) {
        _heap._maxCapacity = cap;
    }


    // function initialize(Heap storage heap, uint256 cap) internal {
    //     if(heap._maxCapacity != 0) {
    //         revert HeapAlreadyInitialized();
    //     }
    //     heap._maxCapacity = cap;
    // }

    function isFull() internal view returns (bool) {
        return _heap._tree.length >= _heap._maxCapacity;
    }

    function size() internal view returns (uint256) {
        return _heap._tree.length;
    }

    function minBid() internal view returns (Bid memory) {
        if(_heap._tree.length == 0) {
            revert HeapEmpty();
        }
        return userBids[_heap._tree[0]];
    }

    function tryInsert(
        Bid memory newBid 
    ) internal returns (bool) {
        userBids[msg.sender] = newBid;
        if (isFull()) {
            if (!isHigherOrEqualBid(userBids[msg.sender], userBids[_heap._tree[0]])) {
                return false;
            }
            // console.log("Replacing lowest bid %s at index %s",userBids[_heap._tree[0]].price, 0);
            userBids[_heap._tree[0]].inHeap = false; //mark the bid out of heap
            userBids[msg.sender].inHeap = true;
            _heap._tree[0] = userBids[msg.sender].bidder;
            heapifyDown(0);
        } else {
            userBids[msg.sender].inHeap = true;
            _heap._tree.push(userBids[msg.sender].bidder);
            heapifyUp(uint64(_heap._tree.length - 1));
        }
        return true;
    }
    //TODO - should uint256 be relaced with uint64 (need to check implications on memory usage)
    function heapifyUp(uint64 index) internal {
        while (index > 0) {
            uint64 parentIndex = (index - 1) / 2;
            if (
                isHigherOrEqualBid(userBids[_heap._tree[index]], userBids[_heap._tree[parentIndex]])
            ) {
                break;
            }
            swap(index, parentIndex);
            index = parentIndex;
        }
    }
    function heapifyDown(address bidder) internal returns (bool) {
        bool bidderFound = false;
        for (uint256 i = 0; i < _heap._tree.length; i++) {
            if(bidder == _heap._tree[i]) {
                heapifyDown(uint64(i));
                bidderFound = true;
                break;
            }
        }
        return bidderFound;
    }

    function heapifyDown(uint64 index) internal {
        uint64 smallest = index;

        while (true) {
            // console.log("heapiying down bid %s at index %s", userBids[_heap._tree[index]].price, index);
            uint64 leftChild = 2 * index + 1;
            uint64 rightChild = 2 * index + 2;
            if (
                leftChild < _heap._tree.length &&
                isHigherOrEqualBid(userBids[_heap._tree[smallest]], userBids[_heap._tree[leftChild]])
            ) {
                smallest = leftChild;
            }
            if (
                rightChild < _heap._tree.length &&
                isHigherOrEqualBid(userBids[_heap._tree[smallest]], userBids[_heap._tree[rightChild]])
            ) {
                smallest = rightChild;
            }
            if (smallest == index) {
                break;
            }
            // console.log("bid %s at index %s is smaller",userBids[_heap._tree[smallest]].price, smallest);
            // console.log("swapping bids at indexes %s, %s", smallest, index);
            swap(smallest, index);
            index = smallest;
        }
    }

    function isHigherOrEqualBid(
        Bid memory _b1,
        Bid memory _b2
    ) internal view returns (bool) {
        return _b1.price > _b2.price ||
            (_b1.price == _b2.price && uint(keccak256(abi.encodePacked (msg.sender, block.timestamp)))%2 == 0);
    }

    function swap(uint64 index1, uint64 index2) private {
        address temp1 = _heap._tree[index1];
        _heap._tree[index1] = _heap._tree[index2];
        _heap._tree[index2] = temp1;
    }

    // debug function, to be deleted afterwards
    function debugIndexHeapVsUserBids() public view {
        for (uint256 i = 0; i < _heap._tree.length; i++) {
            console.log(" ");
            console.log("=== heap.index:", i, "userBid.index", userBids[_heap._tree[i]].inHeap);
            // console.log("=== heap.price:", _heap._tree[i].price, "userBid.price", userBids[_heap._tree[i].bidder].price);
            console.log("userBid.price", userBids[_heap._tree[i]].price);
        }
    }

    function getWinner(uint256 index) internal view returns (Bid memory) {
        return userBids[_heap._tree[index]];
    }

}