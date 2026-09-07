import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Chip, Dropdown, Input, Label, Radio, RadioGroup, TextField } from '@heroui/react';
import { ChevronDown, Copy, GripVertical, Trash2 } from 'lucide-react';
import type { QuestionType, TeacherQuestion, TeacherQuestionOption } from '@nabta/types';
import { AssignmentRichTextEditor } from './AssignmentRichTextEditor';
import { QUIZ_TYPES } from './quizShared';
import { cn } from '@/lib/cn';

export function QuizQuestionCard({
  index,
  question,
  selected,
  onSelect,
  onPrompt,
  onPoints,
  onFeedback,
  onType,
  onOptionText,
  onOptionCorrect,
  onAddOption,
  onDeleteOption,
  onDuplicate,
  onDelete,
  dragHandle,
}: {
  index: number;
  question: TeacherQuestion;
  selected?: boolean;
  onSelect?: () => void;
  onPrompt: (value: string) => void;
  onPoints: (value: number) => void;
  onFeedback: (value: string) => void;
  onType: (type: QuestionType) => void;
  onOptionText: (optionId: string, text: string) => void;
  onOptionCorrect: (optionId: string, isCorrect: boolean) => void;
  onAddOption: () => void;
  onDeleteOption: (optionId: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  dragHandle?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const { t } = useTranslation();
  const [showFeedback, setShowFeedback] = useState(Boolean(question.feedback));

  useEffect(() => {
    if (question.feedback) setShowFeedback(true);
  }, [question.feedback]);

  const exclusive = question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE';

  return (
    <article
      id={`question-${question.id}`}
      onClick={onSelect}
      className={cn(
        'space-y-4 rounded-xl border bg-surface p-4',
        selected ? 'border-accent' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {dragHandle ? (
            <button
              type="button"
              className="text-muted"
              aria-label={t('teacher.reorder')}
              {...dragHandle}
            >
              <GripVertical className="size-4" />
            </button>
          ) : null}
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('teacher.questionNumber', { number: String(index + 1).padStart(2, '0') })}
          </p>
          <Chip size="sm" variant="soft">
            {t(`teacher.questionTypes.${question.type}`)}
          </Chip>
        </div>
        <Dropdown>
          <Dropdown.Trigger>
            <Button size="sm" variant="ghost" isIconOnly aria-label={t('teacher.actions')}>
              <ChevronDown className="size-4" />
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Popover>
            <Dropdown.Menu
              onAction={(key) => {
                const id = String(key);
                if (id === 'duplicate') onDuplicate();
                if (id === 'delete') onDelete();
                if (id.startsWith('type-')) onType(id.slice(5) as QuestionType);
              }}
            >
              <Dropdown.Item id="duplicate" textValue={t('teacher.duplicate')}>
                {t('teacher.duplicate')}
              </Dropdown.Item>
              {QUIZ_TYPES.filter((type) => type !== question.type).map((type) => (
                <Dropdown.Item key={type} id={`type-${type}`} textValue={t(`teacher.questionTypes.${type}`)}>
                  {t('teacher.convertTo', { type: t(`teacher.questionTypes.${type}`) })}
                </Dropdown.Item>
              ))}
              <Dropdown.Item id="delete" textValue={t('teacher.delete')}>
                {t('teacher.delete')}
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      <AssignmentRichTextEditor
        compact
        value={question.prompt}
        onChange={onPrompt}
        placeholder={t('teacher.prompt')}
      />

      {question.type === 'SHORT_ANSWER' ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted">{t('teacher.acceptedAnswers')}</p>
          {question.options.map((option) => (
            <OptionRow
              key={option.id}
              option={option}
              onText={(text) => onOptionText(option.id, text)}
              onDelete={() => onDeleteOption(option.id)}
            />
          ))}
          <Button size="sm" variant="tertiary" onPress={onAddOption}>
            {t('teacher.addAccepted')}
          </Button>
        </div>
      ) : question.type === 'TRUE_FALSE' ? (
        <RadioGroup
          value={question.options.find((option) => option.isCorrect)?.id ?? ''}
          onChange={(value) => {
            if (typeof value === 'string') onOptionCorrect(value, true);
          }}
          className="gap-2"
        >
          {question.options.map((option) => (
            <Radio key={option.id} value={option.id}>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <Radio.Content>
                <Label>{option.text}</Label>
              </Radio.Content>
            </Radio>
          ))}
        </RadioGroup>
      ) : exclusive ? (
        <div className="space-y-2">
          <RadioGroup
            value={question.options.find((option) => option.isCorrect)?.id ?? ''}
            onChange={(value) => {
              if (typeof value === 'string') onOptionCorrect(value, true);
            }}
            className="gap-2"
          >
            {question.options.map((option) => (
              <div key={option.id} className="flex items-center gap-2">
                <Radio value={option.id} className="shrink-0">
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                </Radio>
                <OptionRow
                  option={option}
                  onText={(text) => onOptionText(option.id, text)}
                  onDelete={() => onDeleteOption(option.id)}
                  correct={option.isCorrect}
                />
              </div>
            ))}
          </RadioGroup>
          <Button size="sm" variant="tertiary" onPress={onAddOption}>
            {t('teacher.addOption')}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted">{t('teacher.selectAllCorrect')}</p>
          {question.options.map((option) => (
            <div key={option.id} className="flex items-center gap-2">
              <Checkbox
                isSelected={option.isCorrect}
                onChange={(selected) => onOptionCorrect(option.id, selected)}
              >
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
              </Checkbox>
              <OptionRow
                option={option}
                onText={(text) => onOptionText(option.id, text)}
                onDelete={() => onDeleteOption(option.id)}
                correct={option.isCorrect}
              />
            </div>
          ))}
          <Button size="sm" variant="tertiary" onPress={onAddOption}>
            {t('teacher.addOption')}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
        <TextField
          name={`points-${question.id}`}
          value={String(question.points)}
          onChange={(value) => {
            const next = Number(value);
            if (Number.isFinite(next) && next >= 1) onPoints(Math.min(100, Math.round(next)));
          }}
          className="w-24"
        >
          <Label>{t('teacher.points')}</Label>
          <Input type="number" min={1} max={100} />
        </TextField>
        <div className="flex gap-2">
          <Button size="sm" variant="tertiary" onPress={onDuplicate}>
            <Copy className="size-3.5" />
            {t('teacher.duplicate')}
          </Button>
          <Button size="sm" variant="danger-soft" onPress={onDelete}>
            <Trash2 className="size-3.5" />
            {t('teacher.delete')}
          </Button>
        </div>
      </div>

      {showFeedback ? (
        <TextField
          name={`feedback-${question.id}`}
          value={question.feedback ?? ''}
          onChange={onFeedback}
        >
          <Label>{t('teacher.feedback')}</Label>
          <Input />
        </TextField>
      ) : (
        <button
          type="button"
          className="text-sm text-accent"
          onClick={() => setShowFeedback(true)}
        >
          {t('teacher.addFeedback')}
        </button>
      )}
    </article>
  );
}

function OptionRow({
  option,
  onText,
  onDelete,
  correct,
}: {
  option: TeacherQuestionOption;
  onText: (text: string) => void;
  onDelete: () => void;
  correct?: boolean;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(option.text);
  useEffect(() => setValue(option.text), [option.text]);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          if (value.trim() && value !== option.text) onText(value.trim());
        }}
        className="min-w-0 flex-1"
      />
      {correct ? (
        <Chip size="sm" color="success" variant="soft">
          {t('assessment.correct')}
        </Chip>
      ) : null}
      <Button size="sm" variant="ghost" isIconOnly aria-label={t('teacher.delete')} onPress={onDelete}>
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
