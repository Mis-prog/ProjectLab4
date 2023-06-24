#include "graph.h"

Edge::Edge(int from, int to, int dist)
{
	this->from = from;
	this->to = to;
	this->dist = dist;
}

graph::graph(int countNode, int countEdge, bool directed)
{
	this->countNode = countNode;
	this->countEdge = countEdge;
	this->directed = directed;
}

void graph::AddEdge(int from, int to, int dist)
{
	if (directed) {
		Edge edge(from, to, dist);
		listgraph[from].push_back(edge);
		Node.insert(from); Node.insert(to);
	}
	else {
		Edge edgeto(from, to, dist);
		Edge edgefrom(to, from, dist);
		listgraph[from].push_back(edgeto);
		listgraph[to].push_back(edgefrom);
		Node.insert(from); Node.insert(to);
	}
}

vector<int> graph::mainAlgorithm(int start)
{
	vector<int>  dist(countNode, INF);
	int nearestdist, nearest;

	out.open("commands.js");
	out << "window.prog=`\n";

	for (auto i : Node) {
		out << i << endl;
	}
	if (directed) {
		for (int i = 0; i < countNode; i++) {
			for (auto element : listgraph[i]) {
				out << element.from << "-" << element.to << ",label=" << element.dist << endl;
			}
		}
	}
	else {
		for (int i = 0; i < countNode; i++) {
			for (auto element : listgraph[i]) {
				if (element.from < element.to) {
					out << element.from << "-" << element.to << ",label=" << element.dist << endl;
				}
			}
		}
	}
	if (directed) {
		out << "drawdir" << endl;
	}
	else {
		out << "draw" << endl;
	}
	
	dist[start] = 0;
	priority_queue<pair<int, int>,vector<pair<int, int>>, greater<pair<int, int>>> pq;
	pq.push({ dist[start], start });

	while (!pq.empty()) {
		nearestdist = pq.top().first;
		nearest = pq.top().second;
		pq.pop();
		out << "w,500" << endl;
		out << nearest << ",shape=box,color=orange,label=" << nearest << "/dist:" << dist[nearest] << endl;
		out << "w,500" << endl;
		if (nearestdist != dist[nearest]) {
			continue;
		}
		for (auto element : listgraph[nearest]) {
			if (dist[element.to] > dist[nearest] + element.dist) {
				if (directed) {
					out << "w,500" << endl;
					out << nearest << "-" << element.to << ",color=lime,width=5\n";
					out << "w,500" << endl;
					dist[element.to] = dist[nearest] + element.dist;
					pq.push({ dist[element.to],element.to });
					out << element.to << ",shape=box,color=red,label=" << element.to << "/dist:" << dist[element.to]
						<< endl;
				}
				else {
					out << "w,500" << endl;
					out << min(nearest,element.to) << "-" << max(nearest,element.to) << ",color=lime,width=5\n";
					out << "w,500" << endl;
					dist[element.to] = dist[nearest] + element.dist;
					pq.push({ dist[element.to],element.to });
					out << element.to << ",shape=box,color=red,label=" << element.to << "/dist:" << dist[element.to]
						<< endl;
				}
			}
		}

	}
	out << "`";
	out.close();
	return dist;
}
