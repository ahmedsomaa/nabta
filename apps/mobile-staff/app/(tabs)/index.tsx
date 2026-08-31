import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Card } from 'heroui-native';

function SchoolMark({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => [...w][0] ?? '')
    .join('')
    .toUpperCase() || '?';

  return (
    <View className="size-10 items-center justify-center rounded-lg bg-accent">
      <Text className="text-sm font-semibold text-accent-foreground">{initials}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const schoolName = 'Nabta Demo School';

  return (
    <View className="flex-1 gap-4 bg-background p-4">
      <View className="flex-row items-center gap-3">
        <SchoolMark name={schoolName} />
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">{schoolName}</Text>
          <Text className="text-xs text-muted">{t('nav.roles.TEACHER')}</Text>
        </View>
      </View>
      <Card>
        <Card.Body>
          <Card.Title>{t('dashboard.teacherTitle')}</Card.Title>
          <Card.Description>{t('mobile.comingSoon')}</Card.Description>
        </Card.Body>
      </Card>
      <Button onPress={() => router.push('/auth/login')}>{t('mobile.signIn')}</Button>
    </View>
  );
}
