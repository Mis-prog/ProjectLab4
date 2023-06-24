#include "graph.h"

int main() {
	setlocale(LC_ALL, "Rus");
	graph g(4, 4,1);
	g.AddEdge(0, 1, 3);
	g.AddEdge(1, 2, 3);
	g.AddEdge(2, 3, 3);
	g.AddEdge(3, 0, 3);
	g.mainAlgorithm(1);
	return 0;
}