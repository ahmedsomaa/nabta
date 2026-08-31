import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card } from 'heroui-native';

export default function LoginScreen() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 justify-center gap-4 bg-background p-6">
      <Card>
        <Card.Body>
          <Card.Title>{t('auth.loginTitle')}</Card.Title>
          <Card.Description>{t('mobile.comingSoon')}</Card.Description>
        </Card.Body>
      </Card>
      <Button variant="primary">{t('mobile.signIn')}</Button>
    </View>
  );
}
