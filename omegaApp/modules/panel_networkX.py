from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional, Set
from enum import Enum
import networkx as nx
from collections import defaultdict


class InterfaceType(Enum):
    RJ = "RJ"
    MM = "MM"  # Multi-mode fiber
    SM = "SM"  # Single-mode fiber


class ClassificationType(Enum):
    RED = "RED"
    BLACK = "BLACK"


@dataclass
class Location:
    rack: str  # E.g., "A01-C02"
    u_position: str

    def __str__(self):
        return f"{self.rack}-{self.u_position}"

    def get_rack_identifier(self) -> str:
        """Returns the rack identifier without U position"""
        return f"{self.rack}"

    def get_spine_and_cabinet(self) -> Tuple[str, int]:
        """Extracts the spine (XX) and cabinet number (YY) from the rack name."""
        rack_parts = self.rack.split("-")
        if len(rack_parts) == 2:
            spine = rack_parts[0]
            cabinet = int(rack_parts[1][1:])
            return spine, cabinet
        return "", 0
    


@dataclass
class Panel:
    id: str
    room: str
    location: Location
    interface_type: InterfaceType
    status: bool
    how_many_ports_remain: int
    classification: ClassificationType
    destination: str

    def is_available(self) -> bool:
        return self.how_many_ports_remain > 0 and self.status


class RouteConstraints:
    def __init__(
        self,
        interface_type: Optional[InterfaceType] = None,
        min_free_ports: int = 1,
        classification: Optional[ClassificationType] = None,
        max_hops: Optional[int] = None,
        preferred_rooms: Optional[List[str]] = None,
    ):
        self.interface_type = interface_type
        self.min_free_ports = min_free_ports
        self.classification = classification
        self.max_hops = max_hops
        self.preferred_rooms = set(preferred_rooms) if preferred_rooms else None


class DataCenterMap:
    def __init__(self):
        self.panels: Dict[str, Panel] = {}
        self.graph = nx.Graph()
        # Changed to track panels by their physical location instead of destination
        self.location_panels: Dict[str, Dict[InterfaceType, Set[str]]] = defaultdict(
            lambda: defaultdict(set)
        )
        self.spine_panels: Dict[str, Set[str]] = defaultdict(set)

    def add_panel(self, panel: Panel):
        """Add a panel to the data center map."""
        self.panels[panel.id] = panel
        # Store panel by its physical location instead of destination
        self.location_panels[panel.location.get_rack_identifier()][
            panel.interface_type
        ].add(panel.id)

        spine = panel.location.get_spine_and_cabinet()[0]
        self.spine_panels[spine].add(panel.id)

        self.graph.add_node(
            panel.id,
            location=str(panel.location),
            interface_type=panel.interface_type,
            classification=panel.classification,
            status=panel.status,
            how_many_ports_remain=panel.how_many_ports_remain,
        )

    def connect_panels(self):
        """Create connections between panels based on physical location matching source locations."""
        panel_list = list(self.panels.values())

        for i in range(len(panel_list)):
            for j in range(i + 1, len(panel_list)):
                panel1 = panel_list[i]
                panel2 = panel_list[j]

                # בדיקה שיש לפחות פורט אחד פנוי בכל פאנל
                if not panel1.is_available() or not panel2.is_available() or \
                   panel1.how_many_ports_remain < 1 or panel2.how_many_ports_remain < 1:
                    continue

                # Skip if interface types don't match
                if panel1.interface_type != panel2.interface_type:
                    continue

                # Skip if classifications are incompatible
                if panel1.classification != panel2.classification and panel1.classification is not None and panel2.classification is not None:
                    continue

                """Extracts the spine (XX) and cabinet number (YY) from the destination."""
                spine1, cabinet1 = "", 0
                destination_parts = panel1.destination.split("-")
                if len(destination_parts) == 2:
                    spine1 = destination_parts[0]
                    cabinet1 = int(destination_parts[1][1:])

                spine2, cabinet2 = panel2.location.get_spine_and_cabinet()

                connection_weight = float("inf")
                print("Before")
                print(panel1)
                print(panel2)
                print(spine1, cabinet1)
                print(spine2, cabinet2)
                # Case 1: Direct connection (one panel's destination matches the other's location)
                if (
                    panel1.destination
                    == panel2.location.get_rack_identifier()
                    # or panel2.destination == panel1.location.get_rack_identifier() \\ I didn't check because each panel is represented multiple times. Once in each direction of it.
                ):
                    connection_weight = 1

                # Case 2: Same spine, adjacent cabinets
                elif spine1 == spine2 and abs(cabinet1 - cabinet2) == 1:
                    connection_weight = 2

                # Case 3: Same spine, cabinets 2 steps apart
                elif spine1 == spine2 and abs(cabinet1 - cabinet2) == 2:
                    connection_weight = 3

                # Case 4: Same spine, cabinets more than 2 steps apart but within limit
                elif spine1 == spine2 and abs(cabinet1 - cabinet2) <= 4:
                    connection_weight = 3 + abs(cabinet1 - cabinet2)
                print("After")
                print(connection_weight)
                # Add edge if a valid connection weight was found
                if connection_weight != float("inf"):
                    self.graph.add_edge(
                        panel1.id,
                        panel2.id,
                        weight=connection_weight,
                        interface_type=panel1.interface_type,
                        free_ports=min(panel1.how_many_ports_remain, panel2.how_many_ports_remain),
                        classification=panel1.classification,
                    )

    def find_panels_in_rack(self, room: str, rack: str) -> List[Panel]:
        """Find all panels in a specific rack."""
        rack_id = f"{room}-{rack}"
        return [self.panels[panel_id] for panel_id in self.location_panels[rack_id]]

    def calculate_route_cost(
        self, path: List[str], constraints: RouteConstraints
    ) -> float:
        """Calculate the cost of a route based on edge weights, proximity, and free ports."""
        cost = 0

        for i in range(len(path) - 1):
            edge_data = self.graph.edges[path[i], path[i + 1]]

            # Base cost from edge weight, which reflects connection priority and spine proximity
            cost += edge_data.get("weight", 1)

            # Add penalty if free ports on this link are below the required minimum
            if edge_data["free_ports"] <= constraints.min_free_ports:
                cost += 1

            # Additional penalty for spine-based connections (lower priority)
            if edge_data.get("priority") == "spine":
                cost += 0.5  # This can be adjusted for higher or lower penalty

        return cost

    def find_all_routes(
        self, start_rack: str, end_rack: str, constraints: RouteConstraints
    ) -> List[List[Tuple[str, str]]]:
        """
        Find all possible routes between two racks that meet the constraints.
        Returns routes sorted by priority (weight) and number of hops.
        """
        # Get panels in the start rack that match the interface type
        start_panels = set()
        start_spine = start_rack.split("-")[0]
        
        for panel_id, panel in self.panels.items():
            if panel.interface_type != constraints.interface_type:
                continue
            # בדיקה שיש מספיק פורטים לפי ה-constraints
            if not panel.is_available() or panel.how_many_ports_remain < constraints.min_free_ports:
                continue

            panel_spine = panel.location.get_rack_identifier().split("-")[0]
            panel_dest_spine = panel.destination.split("-")[0]

            # פאנל מתאים לנקודת התחלה אם:
            # 1. הוא נמצא במיקום המבוקש
            # 2. או שהוא נמצא באותה שדרה של המיקום המבוקש
            if (panel.location.get_rack_identifier() == start_rack or  # מיקום זהה
                (panel_spine == start_spine)):    # אותה שדרה במיקום
                start_panels.add(panel_id)

        # Get panels in the end rack that match the interface type
        end_panels = set()
        end_spine = end_rack.split("-")[0]
        
        for panel_id, panel in self.panels.items():
            if panel.interface_type != constraints.interface_type:
                continue
            # בדיקה שיש מספיק פורטים לפי ה-constraints
            if not panel.is_available() or panel.how_many_ports_remain < constraints.min_free_ports:
                continue

            panel_dest_spine = panel.destination.split("-")[0]
            
            # פאנל מתאים לנקודת סיום אם:
            # 1. היעד שלו הוא היעד המבוקש
            # 2. או שהיעד שלו באותה שדרה של היעד המבוקש
            if (panel.destination == end_rack or  # יעד זהה
                panel_dest_spine == end_spine):  # אותה שדרה ביעד
                end_panels.add(panel_id)

        print(f"Start panels: {start_panels}")
        print(f"End panels: {end_panels}")

        all_routes = []

        # Check for direct connections
        for start_panel_id in start_panels:
            start_panel = self.panels[start_panel_id]
            
            # בדיקה האם היעד של הפאנל הוא באותה שדרה של היעד המבוקש
            start_panel_dest_spine = start_panel.destination.split("-")[0]
            end_rack_spine = end_rack.split("-")[0]
            
            # מקרה 1: חיבור ישיר ליעד המבוקש
            if start_panel.destination == end_rack:
                direct_route = [(start_panel_id, start_panel_id)]
                all_routes.append((direct_route, 1))  # Weight of 1 for direct connections
                continue
            
            # מקרה 2: חיבור לאותה שדרה של היעד
            elif start_panel_dest_spine == end_rack_spine:
                # בדיקה האם המרחק בין הארונות סביר
                dest_cabinet = int(start_panel.destination.split("-")[1][1:])
                end_cabinet = int(end_rack.split("-")[1][1:])
                
                if abs(dest_cabinet - end_cabinet) <= 4:  # מרחק סביר בין ארונות
                    direct_spine_route = [(start_panel_id, start_panel_id)]
                    weight = 1 + abs(dest_cabinet - end_cabinet)  # משקל לפי המרחק
                    all_routes.append((direct_spine_route, weight))

        # Find indirect routes
        for start_panel in start_panels:
            for end_panel in end_panels:
                try:
                    # Use all_simple_paths to find all possible routes
                    cutoff = constraints.max_hops if constraints.max_hops else None
                    paths = list(
                        nx.all_simple_paths(
                            self.graph, start_panel, end_panel, cutoff=cutoff
                        )
                    )

                    for path in paths:
                        route = []
                        valid_route = True
                        total_weight = 0

                        # Validate each connection in the path
                        for i in range(len(path) - 1):
                            panel1_id, panel2_id = path[i], path[i + 1]

                            # Get edge data and validate connection
                            if not self.graph.has_edge(panel1_id, panel2_id):
                                valid_route = False
                                break

                            edge_data = self.graph.edges[panel1_id, panel2_id]
                            if not self._validate_connection(edge_data, constraints):
                                valid_route = False
                                break

                            total_weight += edge_data.get("weight", 1)
                            route.append((panel1_id, panel2_id))

                        if valid_route and route:  # Only append non-empty valid routes
                            all_routes.append((route, total_weight))

                except nx.NetworkXNoPath:
                    continue

        # Remove duplicates while preserving order
        seen_routes = set()
        unique_routes = []
        for route, weight in all_routes:
            route_key = tuple(tuple(conn) for conn in route)
            if route_key not in seen_routes:
                seen_routes.add(route_key)
                unique_routes.append((route, weight))

        # Sort routes by total weight (priority) and length
        unique_routes.sort(key=lambda x: (x[1], len(x[0])))

        # Apply room preferences if specified
        if constraints.preferred_rooms:
            unique_routes = self._filter_preferred_rooms(
                unique_routes, constraints.preferred_rooms
            )

        return [
            route for route, _ in unique_routes if route
        ]  # Return only non-empty routes

    def _validate_connection(
        self, edge_data: Dict, constraints: RouteConstraints
    ) -> bool:
        """Validate if a connection meets all specified constraints."""
        if (
            constraints.interface_type
            and edge_data["interface_type"] != constraints.interface_type
        ):
            return False

        if (
            constraints.classification
            and edge_data["classification"] != constraints.classification
        ):
            return False

        if edge_data["free_ports"] < constraints.min_free_ports:
            return False

        return True

    def _filter_preferred_rooms(
        self,
        routes: List[Tuple[List[Tuple[str, str]], float]],
        preferred_rooms: Set[str],
    ) -> List[Tuple[List[Tuple[str, str]], float]]:
        """Filter and prioritize routes based on preferred rooms."""

        def route_room_score(route):
            """Calculate how many panels in the route are in preferred rooms."""
            panels_in_route = set()
            for connection in route[0]:
                panels_in_route.add(connection[0])
                panels_in_route.add(connection[1])

            preferred_count = sum(
                1
                for panel_id in panels_in_route
                if any(
                    room in self.panels[panel_id].location.rack
                    for room in preferred_rooms
                )
            )
            return preferred_count

        # Sort routes by room preference score (higher is better), then by weight
        return sorted(routes, key=lambda x: (-route_room_score(x), x[1]))

    def visualize_route(self, route: List[Tuple[str, str]]) -> str:
        """
        Generate a detailed text-based visualization of the route.

        Args:
            route: List of panel ID tuples representing connections in the route

        Returns:
            str: A formatted string showing the complete route with detailed information
        """
        result = []
        if not route:
            return "No valid route found"

        # Get first and last panels for complete path visualization
        first_panel_id = route[0][0]
        last_panel_id = route[-1][1]
        first_panel = self.panels[first_panel_id]
        last_panel = self.panels[last_panel_id]

        # Add route header with source and destination information
        result.append("Route Details:")
        result.append(
            f"Source Rack: {first_panel.location.rack} → Destination Rack: {last_panel.destination}"
        )
        result.append("-" * 60)

        # Add starting point details
        result.append(f"Start: Panel {first_panel_id} at {first_panel.location}")
        result.append(f"Type: {first_panel.interface_type.value}")
        result.append(f"Classification: {first_panel.classification.value}")
        result.append(f"Available Ports: {first_panel.how_many_ports_remain}")
        result.append("")

        # Add each connection in the path
        for i, (panel1_id, panel2_id) in enumerate(route, 1):
            panel1 = self.panels[panel1_id]
            panel2 = self.panels[panel2_id]

            # Calculate remaining ports for this connection
            free_ports = min(panel1.how_many_ports_remain, panel2.how_many_ports_remain)

            # Add connection details
            result.append(f"Connection {i}:")
            result.append(
                f"  {panel1_id} ({panel1.location} to {panel1.destination}) → {panel2_id} ({panel2.location} to {panel2.destination})"
            )
            result.append(f"  Interface Type: {panel1.interface_type.value}")
            result.append(f"  Free Ports: {free_ports}")
            result.append(f"  Classification: {panel1.classification.value}")

            # Add spine information if panels are in different spines
            spine1, _ = panel1.location.get_spine_and_cabinet()
            spine2, _ = panel2.location.get_spine_and_cabinet()
            if spine1 != spine2:
                result.append(f"  Cross-Spine Connection: {spine1} → {spine2}")

            result.append("")

        # Add ending point details
        result.append(f"End: Panel {last_panel_id} at {last_panel.location}")
        result.append(f"Type: {last_panel.interface_type.value}")
        result.append(f"Classification: {last_panel.classification.value}")
        result.append(f"Available Ports: {last_panel.how_many_ports_remain}")
        result.append(f"Final Destination: {last_panel.destination}")

        return "\n".join(result)


