import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from 'heroui-native';

export default function GradesScreen() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 bg-background p-4">
      <Card>
        <Card.Body>
          <Card.Title>{t('nav.grades')}</Card.Title>
          <Card.Description>{t('mobile.comingSoon')}</Card.Description>
        </Card.Body>
      </Card>
    </View>
  );
}
