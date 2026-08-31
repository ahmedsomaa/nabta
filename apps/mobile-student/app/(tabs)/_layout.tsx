import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="index" options={{ title: t('nav.home') }} />
      <Tabs.Screen name="classes" options={{ title: t('nav.myClasses') }} />
      <Tabs.Screen name="assignments" options={{ title: t('nav.assignments') }} />
      <Tabs.Screen name="grades" options={{ title: t('nav.grades') }} />
    </Tabs>
  );
}
