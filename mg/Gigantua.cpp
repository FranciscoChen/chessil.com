#include <iostream>
#include <chrono>
#include <random>
#include <cstring>

#include "Movelist.hpp"

class MoveReciever
{
public:
	static inline uint64_t nodes;

	static _ForceInline void Init(Board& brd, uint64_t EPInit) {
		MoveReciever::nodes = 0;
		Movelist::Init(EPInit);
	}

	template<class BoardStatus status>
	static _ForceInline void PerfT0()
	{
		nodes++;
	}
	
	template<class BoardStatus status>
	static _ForceInline void PerfT1(Board& brd)
	{
		nodes += Movelist::count<status>(brd);
	}

	template<class BoardStatus status, int depth>
	static _ForceInline void PerfT(Board& brd)
	{
			Movelist::EnumerateMoves<status, MoveReciever, depth>(brd);
	}


#define ENABLEDBG 0
#define ENABLEPRINT 1
#define IFDBG if constexpr (ENABLEDBG) 
#define IFPRN if constexpr (ENABLEPRINT) 

	template<class BoardStatus status, int depth>
	static void Kingmove(const Board& brd, uint64_t from, uint64_t to)
	{
		Board next = Board::Move<BoardPiece::King, status.WhiteMove>(brd, from, to, to & Enemy<status.WhiteMove>(brd));
		IFPRN std::cout << _map_move(from, to) << " ";
		//IFDBG Board::AssertBoardMove<status.WhiteMove>(brd, next, to & Enemy<status.WhiteMove>(brd));

		//PerfT<status.KingMove(), depth - 1>(next);
	}

	template<class BoardStatus status, int depth>
	static void KingCastle(const Board& brd, uint64_t kingswitch, uint64_t rookswitch)
	{
		Board next = Board::MoveCastle<status.WhiteMove>(brd, kingswitch, rookswitch);
		IFPRN std::cout << _map_castle(kingswitch) << " ";
		//IFDBG Board::AssertBoardMove<status.WhiteMove>(brd, next, false);
		//PerfT<status.KingMove(), depth - 1>(next);
	}

	template<class BoardStatus status, int depth>
	static void PawnCheck(map eking, uint64_t to) {
		constexpr bool white = status.WhiteMove;
		map pl = Pawn_AttackLeft<white>(to & Pawns_NotLeft());
		map pr = Pawn_AttackRight<white>(to & Pawns_NotRight());

		if (eking & (pl | pr)) Movestack::Check_Status[depth - 1] = to;
	}

	template<class BoardStatus status, int depth>
	static void KnightCheck(map eking, uint64_t to) {
		constexpr bool white = status.WhiteMove;

		if (Lookup::Knight(SquareOf(eking)) & to) Movestack::Check_Status[depth - 1] = to;
	}
	

	template<class BoardStatus status, int depth>
	static void Pawnmove(const Board& brd, uint64_t from, uint64_t to)
	{
		Board next = Board::Move<BoardPiece::Pawn, status.WhiteMove, false>(brd, from, to);
		IFPRN std::cout << _map_move(from, to) << " ";
		//IFDBG Board::AssertBoardMove<status.WhiteMove>(brd, next, to & Enemy<status.WhiteMove>(brd));
		//PawnCheck<status, depth>(EnemyKing<status.WhiteMove>(brd), to);
		//PerfT<status.SilentMove(), depth - 1>(next);
		//Movestack::Check_Status[depth - 1] = 0xffffffffffffffffull;
	}

	template<class BoardStatus status, int depth>
	static void Pawnatk(const Board& brd, uint64_t from, uint64_t to)
	{
		Board next = Board::Move<BoardPiece::Pawn, status.WhiteMove, true>(brd, from, to);
		IFPRN std::cout << _map_move(from, to) << " ";
		//IFDBG Board::AssertBoardMove<status.WhiteMove>(brd, next, to & Enemy<status.WhiteMove>(brd));
		//PawnCheck<status, depth>(EnemyKing<status.WhiteMove>(brd), to);
		//PerfT<status.SilentMove(), depth - 1>(next);
		//Movestack::Check_Status[depth - 1] = 0xffffffffffffffffull;
	}

	template<class BoardStatus status, int depth>
	static void PawnEnpassantTake(const Board& brd, uint64_t from, uint64_t enemy, uint64_t to)
	{
		Board next = Board::MoveEP<status.WhiteMove>(brd, from, enemy, to);
		IFPRN std::cout << _map_move(from, to) << " ";
		//IFDBG Board::AssertBoardMove<status.WhiteMove>(brd, next, true);
		//PawnCheck<status, depth>(EnemyKing<status.WhiteMove>(brd), to);
		//PerfT<status.SilentMove(), depth - 1>(next);
		//Movestack::Check_Status[depth - 1] = 0xffffffffffffffffull;
	}

	template<class BoardStatus status, int depth>
	static void Pawnpush(const Board& brd, uint64_t from, uint64_t to)
	{
		Board next = Board::Move <BoardPiece::Pawn, status.WhiteMove, false>(brd, from, to);
		IFPRN std::cout << _map_move(from, to) << " ";
		//IFDBG Board::AssertBoardMove<status.WhiteMove>(brd, next, to & Enemy<status.WhiteMove>(brd));

		//Movelist::EnPassantTarget = to;
		//PawnCheck<status, depth>(EnemyKing<status.WhiteMove>(brd), to);
		//PerfT<status.PawnPush(), depth - 1>(next);
		//Movestack::Check_Status[depth - 1] = 0xffffffffffffffffull;
	}

	template<class BoardStatus status, int depth>
	static void Pawnpromote(const Board& brd, uint64_t from, uint64_t to)
	{
		Board next1 = Board::MovePromote<BoardPiece::Queen, status.WhiteMove>(brd, from, to);
		IFPRN std::cout << _map_move(from, to) << "q ";
		//IFDBG Board::AssertBoardMove<status.WhiteMove>(brd, next1, to & Enemy<status.WhiteMove>(brd));
		//PerfT<status.SilentMove(), depth - 1>(next1);

		Board next2 = Board::MovePromote<BoardPiece::Knight, status.WhiteMove>(brd, from, to);
		IFPRN std::cout << _map_move(from, to) << "n ";
		//KnightCheck<status, depth>(EnemyKing<status.WhiteMove>(brd), to);
		//PerfT<status.SilentMove(), depth - 1>(next2);
		//Movestack::Check_Status[depth - 1] = 0xffffffffffffffffull;

		Board next3 = Board::MovePromote<BoardPiece::Bishop, status.WhiteMove>(brd, from, to);
		IFPRN std::cout << _map_move(from, to) << "b ";
		//PerfT<status.SilentMove(), depth - 1>(next3);
		Board next4 = Board::MovePromote<BoardPiece::Rook, status.WhiteMove>(brd, from, to);
		IFPRN std::cout << _map_move(from, to) << "r ";
		//PerfT<status.SilentMove(), depth - 1>(next4);
	}

	template<class BoardStatus status, int depth>
	static void Knightmove(const Board& brd, uint64_t from, uint64_t to)
	{
		Board next = Board::Move <BoardPiece::Knight, status.WhiteMove>(brd, from, to, to & Enemy<status.WhiteMove>(brd));
		IFPRN std::cout << _map_move(from, to) << " ";
		//IFDBG Board::AssertBoardMove<status.WhiteMove>(brd, next, to & Enemy<status.WhiteMove>(brd));
		//KnightCheck<status, depth>(EnemyKing<status.WhiteMove>(brd), to);
		//PerfT<status.SilentMove(), depth - 1>(next);
		//Movestack::Check_Status[depth - 1] = 0xffffffffffffffffull;
	}

	template<class BoardStatus status, int depth>
	static void Bishopmove(const Board& brd, uint64_t from, uint64_t to)
	{
		Board next = Board::Move <BoardPiece::Bishop, status.WhiteMove>(brd, from, to, to & Enemy<status.WhiteMove>(brd));
		IFPRN std::cout << _map_move(from, to) << " ";
		//IFDBG Board::AssertBoardMove<status.WhiteMove>(brd, next, to & Enemy<status.WhiteMove>(brd));
		//PerfT<status.SilentMove(), depth - 1>(next);
	}

	template<class BoardStatus status, int depth>
	static void Rookmove(const Board& brd, uint64_t from, uint64_t to)
	{
		Board next = Board::Move<BoardPiece::Rook, status.WhiteMove>(brd, from, to, to & Enemy<status.WhiteMove>(brd));
		IFPRN std::cout << _map_move(from, to) << " ";
		//IFDBG Board::AssertBoardMove<status.WhiteMove>(brd, next, to & Enemy<status.WhiteMove>(brd));
	//	if constexpr (status.CanCastle()) {
			//if (status.IsLeftRook(from)) PerfT<status.RookMove_Left(), depth - 1>(next);
			//else if (status.IsRightRook(from)) PerfT<status.RookMove_Right(), depth - 1>(next);
			//else PerfT<status.SilentMove(), depth - 1>(next);
	//	}
		//else PerfT<status.SilentMove(), depth - 1>(next);
	}

	template<class BoardStatus status, int depth>
	static void Queenmove(const Board& brd, uint64_t from, uint64_t to)
	{
		Board next = Board::Move<BoardPiece::Queen, status.WhiteMove>(brd, from, to, to & Enemy<status.WhiteMove>(brd));
		IFPRN std::cout << _map_move(from, to) << " ";
		//IFDBG Board::AssertBoardMove<status.WhiteMove>(brd, next, to & Enemy<status.WhiteMove>(brd));
		//PerfT<status.SilentMove(), depth - 1>(next);
	}
};


template<class BoardStatus status>
static void PerfT(std::string_view def, Board& brd, int depth)
{
	MoveReciever::Init(brd, FEN::FenEnpassant(def));

	//Seemap see;
	//Movegen::InitBoard<status>(see, brd.UnpackAll());

	/// <summary>
	/// Go into recursion on depth 2 - entry point for perft
	/// </summary>
	switch (depth)
	{
		case 0: Movelist::InitStack<status, 0>(brd); MoveReciever::PerfT0<status>(); return;
		case 1: Movelist::InitStack<status, 1>(brd); MoveReciever::PerfT<status, 1>(brd); return;
//		case 2: Movelist::InitStack<status, 2>(brd); MoveReciever::PerfT<status, 2>(brd); return;
//		case 3: Movelist::InitStack<status, 3>(brd); MoveReciever::PerfT<status, 3>(brd);  return;
//		case 4: Movelist::InitStack<status, 4>(brd); MoveReciever::PerfT<status, 4>(brd);  return;
//		case 5: Movelist::InitStack<status, 5>(brd); MoveReciever::PerfT<status, 5>(brd);  return;
//		case 6: Movelist::InitStack<status, 6>(brd); MoveReciever::PerfT<status, 6>(brd);  return;
//		case 7: Movelist::InitStack<status, 7>(brd); MoveReciever::PerfT<status, 7>(brd);  return;
//		case 8: Movelist::InitStack<status, 8>(brd); MoveReciever::PerfT<status, 8>(brd);  return;
//		case 9: Movelist::InitStack<status, 9>(brd); MoveReciever::PerfT<status, 9>(brd);  return;
//		case 10: Movelist::InitStack<status, 10>(brd); MoveReciever::PerfT<status, 10>(brd); return;
//		case 11: Movelist::InitStack<status, 11>(brd); MoveReciever::PerfT<status, 11>(brd); return;
//		case 12: Movelist::InitStack<status, 12>(brd); MoveReciever::PerfT<status, 12>(brd); return;
//		case 13: Movelist::InitStack<status, 13>(brd); MoveReciever::PerfT<status, 13>(brd); return;
//		case 14: Movelist::InitStack<status, 14>(brd); MoveReciever::PerfT<status, 14>(brd); return;
//		case 15: Movelist::InitStack<status, 15>(brd); MoveReciever::PerfT<status, 15>(brd); return;
//		case 16: Movelist::InitStack<status, 16>(brd); MoveReciever::PerfT<status, 16>(brd); return;
//		case 17: Movelist::InitStack<status, 17>(brd); MoveReciever::PerfT<status, 17>(brd); return;
//		case 18: Movelist::InitStack<status, 18>(brd); MoveReciever::PerfT<status, 18>(brd); return;
		default:
			std::cout << "Depth not impl yet" << std::endl;
			return;
	}
}
PositionToTemplate(PerfT);

int main(int argc, char** argv)
//int main()
{
//	std::string buffer;
//	while (std::getline(std::cin, buffer)) {
	//	_PerfT(buffer, 1);
//    	}
	std::vector<std::string> args(argv, argv + argc);
	std::string_view def(argv[1]);
	_PerfT(def, 1);
	return 0;
}
