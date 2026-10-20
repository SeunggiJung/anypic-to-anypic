/** AnyPicToAnyPic — 'Pic' 두 곳을 강조색으로 */
export default function Logo() {
  return (
    <span aria-label="AnyPicToAnyPic">
      <span aria-hidden="true">
        Any<span className="text-accent">Pic</span>To<span>Any</span>
        <span className="text-accent">Pic</span>
      </span>
    </span>
  );
}
