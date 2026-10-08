import EmployeeActivationForm from "@/components/auth/employee-activation-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  return (
    <EmployeeActivationForm
      invitationId={firstSearchParam(params.invitation)}
      tokenHash={firstSearchParam(params.token_hash)}
    />
  );
}
