import { getTranslations } from "next-intl/server";
import { getUserStats } from "@/lib/actions";
import { formatScale } from "@/lib/rating";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { booksEnabled } from "@/lib/features";

export async function StatsView() {
  const t = await getTranslations("stats");
  const stats = await getUserStats();

  return (
    <section>
      <h2 className="mb-3 mt-6 text-lg font-semibold">{t("moviesSection")}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              {t("watched")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats?.watched ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              {t("want")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats?.want ?? 0}</p>
          </CardContent>
        </Card>
        {stats?.avgRating != null && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-muted-foreground">
                {t("avgRating")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{formatScale(stats.avgRating)}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {booksEnabled && (
      <>
      <h2 className="mb-3 mt-8 text-lg font-semibold">{t("booksSection")}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              {t("read")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats?.books?.read ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              {t("wantRead")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats?.books?.want ?? 0}</p>
          </CardContent>
        </Card>
        {stats?.books?.avgRating != null && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-muted-foreground">
                {t("avgBookRating")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{formatScale(stats.books.avgRating)}</p>
            </CardContent>
          </Card>
        )}
      </div>
      </>
      )}
    </section>
  );
}
