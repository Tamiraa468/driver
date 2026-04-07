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
      <ScreenHeader title={title} subtitle="Хэрэглэгчийн урсгалын түр дэлгэц" />
      <StateView title={title} description={description} />
    </SafeAreaView>
  );
}

export const HomeScreen = () => (
  <PlaceholderScreen
    title="Хэрэглэгчийн нүүр"
    description="Хэрэглэгчийн дэлгэцүүд энэ workspace-д хараахан хийгдээгүй байна."
  />
);

export const ShopDetailScreen = () => (
  <PlaceholderScreen
    title="Дэлгүүрийн дэлгэрэнгүй"
    description="Хэрэглэгчийн модуль нэмэгдсэний дараа дэлгүүрийн дэлгэрэнгүй энд харагдана."
  />
);

export const CartScreen = () => (
  <PlaceholderScreen
    title="Сагс"
    description="Сагсны боломж энэ workspace-д хараахан идэвхгүй байна."
  />
);

export const OrdersScreen = () => (
  <PlaceholderScreen
    title="Хэрэглэгчийн захиалгууд"
    description="Хэрэглэгчийн захиалгын түүх энэ workspace-д хараахан бэлэн болоогүй байна."
  />
);

export const ProfileScreen = () => (
  <PlaceholderScreen
    title="Хэрэглэгчийн профайл"
    description="Хэрэглэгчийн профайл дэлгэцүүд энэ workspace-д хараахан хийгдээгүй байна."
  />
);
