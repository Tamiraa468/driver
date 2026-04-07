import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader, StateView } from "../../components/ui";
import { Colors } from "../../constants/design";

function PlaceholderScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScreenHeader title={title} subtitle="Нийлүүлэгчийн урсгалын түр дэлгэц" />
      <StateView title={title} description={description} />
    </SafeAreaView>
  );
}

export const DashboardScreen = () => (
  <PlaceholderScreen
    title="Нийлүүлэгчийн самбар"
    description="Нийлүүлэгчийн самбарын дэлгэцүүд энэ workspace-д хараахан хийгдээгүй байна."
  />
);

export const ProductsScreen = () => (
  <PlaceholderScreen
    title="Бүтээгдэхүүн"
    description="Нийлүүлэгчийн бүтээгдэхүүн удирдах боломж энэ workspace-д хараахан идэвхгүй байна."
  />
);

export const OrdersScreen = () => (
  <PlaceholderScreen
    title="Нийлүүлэгчийн захиалгууд"
    description="Нийлүүлэгчийн захиалга удирдах боломж энэ workspace-д хараахан идэвхгүй байна."
  />
);

export const ProfileScreen = () => (
  <PlaceholderScreen
    title="Нийлүүлэгчийн профайл"
    description="Нийлүүлэгчийн профайл дэлгэцүүд энэ workspace-д хараахан хийгдээгүй байна."
  />
);
