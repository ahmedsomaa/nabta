import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BrandMark } from '@/components/shared/BrandMark';
import '@/lib/i18n';

describe('BrandMark', () => {
  it('renders Nabta brand', () => {
    render(
      <MemoryRouter>
        <BrandMark />
      </MemoryRouter>,
    );
    expect(screen.getByText('Nabta')).toBeInTheDocument();
  });
});
