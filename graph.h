#pragma once

#include <iostream>
#include <fstream>
#include <vector>
#include <random>
#include <queue>
#include <set>
#include <locale.h>

using namespace std;

const int INF = 1e9;
const int maxN = 100;

struct Edge {
    int from, to, dist;
    Edge(int from, int to, int dist);
};

class graph {
private:
    int countEdge, countNode;
    bool directed;
    ofstream out;
    vector<Edge> listgraph[100];
    set<int> Node;
public:
    graph(int countNode, int countEdge, bool directed = 0);
    void AddEdge(int from, int to, int dist);
    vector<int> mainAlgorithm(int start);
};

