import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import stationsData from "../stations.json";

const API_BASE_URL = "http://localhost:3000";

const TRAIN_TYPES = [
  "Intercity",
  "Sprinter",
  "Intercity Direct",
  "Thalys",
  "Eurostar",
  "IC Direct",
  "ICE",
  "Nightjet",
  "IC Berlijn",
];

const SPECIAL_NOTICES = [
  "Rijdt niet",
  "Vertraging",
  "Gedeeltelijk opgeheven",
  "Rijdt via andere route",
  "Extra trein",
  "Minder wagons",
  "Stopt niet op alle stations",
  "Vervangend vervoer",
  "Aanrijding persoon",
  "Aanrijding dier",
  "Aanrijding voertuig",
  "Wisselstoring",
  "Defecte trein",
  "Weersomstandigheden",
  "Seinsstoring",
  "Defecte bovenleiding",
];

const STATIONS = stationsData.stations.map((s) => s.name);

interface StationAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (station: string) => void;
  placeholder: string;
  selectedStations?: string[];
}

function StationAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder,
  selectedStations = [],
}: StationAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (!value.trim()) return [];
    const searchTerm = value.toLowerCase();
    return STATIONS.filter(
      (station) =>
        station.toLowerCase().includes(searchTerm) &&
        !selectedStations.includes(station)
    ).slice(0, 5);
  }, [value, selectedStations]);

  const handleSelect = (station: string) => {
    onSelect(station);
    setShowSuggestions(false);
  };

  return (
    <View style={styles.autocompleteContainer}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholderTextColor="#999"
      />
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.suggestionItem}
              onPress={() => handleSelect(item)}
            >
              <Text style={styles.suggestionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function Index() {
  const [trainType, setTrainType] = useState<string>("");
  const [fromStation, setFromStation] = useState<string>("");
  const [fromStationSearch, setFromStationSearch] = useState<string>("");
  const [toStation, setToStation] = useState<string>("");
  const [toStationSearch, setToStationSearch] = useState<string>("");
  const [allRouteStops, setAllRouteStops] = useState<string[]>([]);
  const [hours, setHours] = useState<string>("");
  const [minutes, setMinutes] = useState<string>("");
  const [selectedNotices, setSelectedNotices] = useState<string[]>([]);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);

  const handleFromSelect = (station: string) => {
    setFromStation(station);
    setFromStationSearch(station);
  };

  const handleToSelect = (station: string) => {
    setToStation(station);
    setToStationSearch(station);
  };

  const fetchRoute = async (from: string, to: string) => {
    setLoadingRoute(true);
    try {
      // Gebruik ingevulde tijd of default naar 10:00
      let dateTime: string;
      const timeStr =
        hours && minutes
          ? `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`
          : null;
      if (timeStr) {
        // Default: morgen om ingevulde tijd
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
        const day = String(tomorrow.getDate()).padStart(2, "0");
        dateTime = `${year}-${month}-${day}T${timeStr}`;
      } else {
        // Default: morgen om 10:00
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
        const day = String(tomorrow.getDate()).padStart(2, "0");
        dateTime = `${year}-${month}-${day}T10:00`;
      }

      const response = await fetch(`${API_BASE_URL}/api/route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          dateTime,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.stops && Array.isArray(data.stops)) {
        // Sla alle stops op voor de route visualisatie
        setAllRouteStops(data.stops);
      }
    } catch (error) {
      console.error("Error fetching route:", error);
      Alert.alert(
        "Fout",
        "Kon de route niet ophalen. Controleer of de backend server draait."
      );
    } finally {
      setLoadingRoute(false);
    }
  };

  useEffect(() => {
    if (fromStation && toStation) {
      fetchRoute(fromStation, toStation);
    } else {
      // Reset route als een van de stations wordt verwijderd
      setAllRouteStops([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromStation, toStation, hours, minutes]);

  const removeRouteStop = (station: string) => {
    // Update allRouteStops
    setAllRouteStops(allRouteStops.filter((s) => s !== station));
  };

  // Bepaal welke stations tussenstations zijn (niet van en niet naar)
  const intermediateStops = useMemo(() => {
    if (!fromStation || !toStation || allRouteStops.length === 0) {
      return [];
    }
    return allRouteStops.filter(
      (stop) => stop !== fromStation && stop !== toStation
    );
  }, [allRouteStops, fromStation, toStation]);

  const toggleNotice = (notice: string) => {
    if (selectedNotices.includes(notice)) {
      setSelectedNotices(selectedNotices.filter((n) => n !== notice));
    } else {
      setSelectedNotices([...selectedNotices, notice]);
    }
  };

  const generateAnnouncement = () => {
    if (!trainType || !fromStation || !toStation || !hours || !minutes) {
      Alert.alert(
        "Incomplete",
        "Vul minimaal treintype, van, naar en tijd in."
      );
      return;
    }

    const timeStr = `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
    let announcement = `${trainType} van ${fromStation} naar ${toStation}`;

    if (intermediateStops.length > 0) {
      announcement += ` via ${intermediateStops.join(", ")}`;
    }

    announcement += `, vertrekt om ${timeStr}`;

    if (selectedNotices.length > 0) {
      announcement += `. ${selectedNotices.join(". ")}.`;
    }

    Alert.alert("Omroep", announcement);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Treinomroep Generator</Text>

        {/* Train Type Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Treintype *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
          >
            {TRAIN_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.chip, trainType === type && styles.chipSelected]}
                onPress={() => setTrainType(type)}
              >
                <Text
                  style={[
                    styles.chipText,
                    trainType === type && styles.chipTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Vertrektijd *</Text>
          <View style={styles.timeInputContainer}>
            <View style={styles.timeInputWrapper}>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="Uren"
                value={hours}
                onChangeText={(text) => {
                  // Alleen cijfers, max 2 cijfers, max 23
                  const num = text.replace(/[^0-9]/g, "");
                  if (
                    num === "" ||
                    (parseInt(num) >= 0 && parseInt(num) <= 23)
                  ) {
                    setHours(num.slice(0, 2));
                  }
                }}
                keyboardType="numeric"
                placeholderTextColor="#999"
                maxLength={2}
              />
              <Text style={styles.timeSeparator}>:</Text>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="Minuten"
                value={minutes}
                onChangeText={(text) => {
                  // Alleen cijfers, max 2 cijfers, max 59
                  const num = text.replace(/[^0-9]/g, "");
                  if (
                    num === "" ||
                    (parseInt(num) >= 0 && parseInt(num) <= 59)
                  ) {
                    setMinutes(num.slice(0, 2));
                  }
                }}
                keyboardType="numeric"
                placeholderTextColor="#999"
                maxLength={2}
              />
            </View>
          </View>
        </View>

        {/* From Station Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Van *</Text>
          <StationAutocomplete
            value={fromStationSearch}
            onChangeText={setFromStationSearch}
            onSelect={handleFromSelect}
            placeholder="Zoek station, bijv. Schagen"
          />
          {fromStation && (
            <View style={styles.selectedStationContainer}>
              <Text style={styles.selectedStationText}>Van: {fromStation}</Text>
              <TouchableOpacity
                onPress={() => {
                  setFromStation("");
                  setFromStationSearch("");
                  setAllRouteStops([]);
                }}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Route Visualization */}
        {fromStation && toStation && intermediateStops.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Route</Text>
            <View style={styles.routeContainer}>
              {/* Van station */}
              <View style={styles.routeStation}>
                <View style={styles.routeStationCircle} />
                <Text style={styles.routeStationText}>{fromStation}</Text>
              </View>

              {/* Verticale lijn */}
              <View style={styles.routeLine} />

              {/* Tussenstations */}
              {intermediateStops.map((station, index) => (
                <View key={`${station}-${index}`}>
                  <View style={styles.routeStation}>
                    <View style={styles.routeStationCircle} />
                    <Text style={styles.routeStationText}>{station}</Text>
                    <TouchableOpacity
                      onPress={() => removeRouteStop(station)}
                      style={styles.routeRemoveButton}
                    >
                      <Text style={styles.routeRemoveButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                  {index < intermediateStops.length - 1 && (
                    <View style={styles.routeLine} />
                  )}
                </View>
              ))}

              {/* Verticale lijn naar laatste station */}
              {intermediateStops.length > 0 && (
                <View style={styles.routeLine} />
              )}

              {/* Naar station */}
              <View style={styles.routeStation}>
                <View style={styles.routeStationCircle} />
                <Text style={styles.routeStationText}>{toStation}</Text>
              </View>
            </View>
          </View>
        )}

        {/* To Station Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Naar *</Text>
          <StationAutocomplete
            value={toStationSearch}
            onChangeText={setToStationSearch}
            onSelect={handleToSelect}
            placeholder="Zoek station, bijv. Den Haag Centraal"
            selectedStations={[fromStation].filter(Boolean)}
          />
          {toStation && (
            <View style={styles.selectedStationContainer}>
              <Text style={styles.selectedStationText}>Naar: {toStation}</Text>
              {loadingRoute && (
                <ActivityIndicator
                  size="small"
                  color="#0066cc"
                  style={{ marginLeft: 8 }}
                />
              )}
              <TouchableOpacity
                onPress={() => {
                  setToStation("");
                  setToStationSearch("");
                  setAllRouteStops([]);
                }}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Special Notices */}
        <View style={styles.section}>
          <Text style={styles.label}>Bijzonderheden</Text>
          <View style={styles.noticesContainer}>
            {SPECIAL_NOTICES.map((notice) => (
              <TouchableOpacity
                key={notice}
                style={[
                  styles.noticeChip,
                  selectedNotices.includes(notice) && styles.noticeChipSelected,
                ]}
                onPress={() => toggleNotice(notice)}
              >
                <Text
                  style={[
                    styles.noticeChipText,
                    selectedNotices.includes(notice) &&
                      styles.noticeChipTextSelected,
                  ]}
                >
                  {notice}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateAnnouncement}
        >
          <Text style={styles.generateButtonText}>Genereer Omroep</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 30,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  chipSelected: {
    backgroundColor: "#0066cc",
    borderColor: "#0066cc",
  },
  chipText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#fff",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  timeInputContainer: {
    flexDirection: "row",
  },
  timeInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  timeInput: {
    flex: 1,
    textAlign: "center",
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginHorizontal: 8,
  },
  noticesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  noticeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  noticeChipSelected: {
    backgroundColor: "#ff6b6b",
    borderColor: "#ff6b6b",
  },
  noticeChipText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  noticeChipTextSelected: {
    color: "#fff",
  },
  generateButton: {
    backgroundColor: "#0066cc",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  generateButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  autocompleteContainer: {
    position: "relative",
  },
  suggestionsContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  suggestionText: {
    fontSize: 16,
    color: "#333",
  },
  selectedStationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  selectedStationText: {
    flex: 1,
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "500",
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0066cc",
    justifyContent: "center",
    alignItems: "center",
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 16,
  },
  infoText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    fontStyle: "italic",
  },
  routeContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  routeStation: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  routeStationCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0066cc",
    marginRight: 12,
  },
  routeStationText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: "#0066cc",
    marginLeft: 5,
    marginVertical: 2,
  },
  routeRemoveButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  routeRemoveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 16,
  },
});
