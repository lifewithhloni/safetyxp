import ResetPasswordForm from "@/components/auth/reset-password-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const invitation = params.invitation;
  const invitationId = Array.isArray(invitation) ? invitation[0] : invitation;

  return <ResetPasswordForm invitationId={invitationId ?? null} />;
}
