import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Card } from 'heroui-native';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="flex-1 gap-4 bg-background p-4">
      <Card>
        <Card.Body>
          <Card.Title>{t('dashboard.studentTitle')}</Card.Title>
          <Card.Description>{t('mobile.comingSoon')}</Card.Description>
        </Card.Body>
      </Card>
      <Button onPress={() => router.push('/auth/login')}>{t('mobile.signIn')}</Button>
    </View>
  );
}
