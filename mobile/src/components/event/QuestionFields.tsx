import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';
import { type Answers, type EventQuestion, isFileAnswer, QUESTION_LIMITS } from '@/types';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoChip } from '~/components/neo/NeoChip';
import { NeoInput } from '~/components/neo/NeoInput';
import { NeoText } from '~/components/neo/NeoText';
import { borderWidths } from '~/constants/theme';
import { useI18n } from '~/hooks/useI18n';
import { useTheme } from '~/hooks/useTheme';
import { buildEventUrl } from '~/services/deepLink';

interface QuestionFieldsProps {
  slug: string;
  questions: EventQuestion[];
  answers: Answers;
  onChange: (next: Answers) => void;
}

/**
 * A required file question that has no file yet. The app cannot attach files, so an answer
 * to such an event has to be given on the website.
 */
export function fileQuestionBlocking(questions: EventQuestion[], answers: Answers): EventQuestion | null {
  return questions.find(q => q.type === 'file' && q.required && !isFileAnswer(answers[q.id])) ?? null;
}

/** The creator's questions, as the person answering fills them in. Same rules as the website's. */
export function QuestionFields({ slug, questions, answers, onChange }: QuestionFieldsProps) {
  const { t } = useI18n();
  const { colors } = useTheme();

  if (questions.length === 0) return null;

  const setAnswer = (id: string, value: Answers[string] | undefined) => {
    const next = { ...answers };
    if (value === undefined) delete next[id];
    else next[id] = value;
    onChange(next);
  };

  // An in-app browser tab, because a plain link to the event would open this app again.
  const openOnWebsite = () => {
    WebBrowser.openBrowserAsync(buildEventUrl(slug)).catch(() => {});
  };

  return (
    <View style={[styles.questions, { borderBottomColor: colors.ink }]}>
      <NeoText variant="caption" tone="muted">
        {t('answersVisibilityNote')}
      </NeoText>

      {questions.map(q => {
        const answer = answers[q.id];
        const label = q.required ? `${q.label} *` : q.label;
        const spokenLabel = q.required ? `${q.label} (${t('questionRequiredLabel')})` : q.label;

        if (q.type === 'text') {
          return (
            <NeoInput
              key={q.id}
              label={label}
              accessibilityLabel={spokenLabel}
              value={typeof answer === 'string' ? answer : ''}
              onChangeText={text => setAnswer(q.id, text || undefined)}
              maxLength={QUESTION_LIMITS.textAnswer}
              multiline
              style={styles.textAnswer}
            />
          );
        }

        if (q.type === 'choice' || q.type === 'multi') {
          const picked = q.type === 'multi' && Array.isArray(answer) ? answer : [];
          return (
            <View key={q.id} style={styles.field}>
              <NeoText variant="label">{label}</NeoText>
              {q.type === 'multi' && (
                <NeoText variant="caption" tone="muted">
                  {t('multiChoiceHint')}
                </NeoText>
              )}
              <View style={styles.options}>
                {(q.options ?? []).map(option => {
                  const isOn = q.type === 'multi' ? picked.includes(option) : answer === option;
                  return (
                    <NeoChip
                      key={option}
                      label={option}
                      // Read out with its question, since a chip on its own says only "M".
                      accessibilityLabel={`${spokenLabel}: ${option}`}
                      selected={isOn}
                      onPress={() => {
                        if (q.type === 'multi') {
                          const next = isOn ? picked.filter(o => o !== option) : [...picked, option];
                          setAnswer(q.id, next.length > 0 ? next : undefined);
                        } else {
                          // Picking the chosen option again clears it, so an optional question can be left blank.
                          setAnswer(q.id, isOn ? undefined : option);
                        }
                      }}
                    />
                  );
                })}
              </View>
            </View>
          );
        }

        // A file. One attached on the website is kept and sent back untouched with every save.
        return (
          <View key={q.id} style={styles.field}>
            <NeoText variant="label">{label}</NeoText>
            {isFileAnswer(answer) ? (
              <NeoText variant="caption">{t('fileAttachedOnWeb', { name: answer.name })}</NeoText>
            ) : (
              <NeoText variant="caption" tone="muted">
                {t(q.required ? 'fileQuestionRequiredOnWeb' : 'fileQuestionOnWeb')}
              </NeoText>
            )}
            <View style={styles.webButton}>
              <NeoButton label={t('openOnWebsiteBtn')} size="sm" variant="secondary" onPress={openOnWebsite} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  questions: { gap: 14, paddingBottom: 16, borderBottomWidth: borderWidths.regular },
  field: { gap: 6 },
  // Two lines tall like the website's, with the text starting at the top on Android too.
  textAnswer: { minHeight: 72, textAlignVertical: 'top' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  webButton: { alignSelf: 'flex-start' },
});
