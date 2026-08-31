import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/lib/i18n';
import { BrandMark } from '@/components/shared/BrandMark';

describe('BrandMark', () => {
  it('renders English brand name by default', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    render(
      <MemoryRouter>
        <BrandMark />
      </MemoryRouter>,
    );
    expect(screen.getByText('Nabta')).toBeInTheDocument();
  });

  it('renders Arabic brand name when locale is ar', async () => {
    await act(async () => {
      await i18n.changeLanguage('ar');
    });
    render(
      <MemoryRouter>
        <BrandMark />
      </MemoryRouter>,
    );
    expect(screen.getByText('نبتة')).toBeInTheDocument();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });
});
