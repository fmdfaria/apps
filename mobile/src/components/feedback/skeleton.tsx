import { View } from 'react-native';

type SkeletonProps = {
  lines?: number;
};

export function SkeletonBlock({ lines = 3 }: SkeletonProps) {
  return (
    <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
      {Array.from({ length: lines }).map((_, index) => (
        <View
          key={index}
          className="mb-3 h-4 rounded-full bg-slate-200 last:mb-0"
          style={{ width: `${100 - index * 12}%` }}
        />
      ))}
    </View>
  );
}
