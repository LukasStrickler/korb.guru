import { renderRouter, screen } from "expo-router/testing-library";
import { View, Text } from "react-native";

describe("Home route (integration)", () => {
  it("renders initial route and pathname is /", async () => {
    const MockHome = () => (
      <View>
        <Text>Home</Text>
      </View>
    );
    renderRouter(
      {
        index: MockHome,
        "(home)/index": MockHome,
      },
      { initialUrl: "/" },
    );
    expect(screen).toHavePathname("/");
  });

  it("renders with initialUrl and pathname matches", async () => {
    const MockScreen = () => (
      <View>
        <Text>Screen</Text>
      </View>
    );
    renderRouter(
      {
        index: MockScreen,
        other: MockScreen,
      },
      { initialUrl: "/other" },
    );
    expect(screen).toHavePathname("/other");
  });
});
