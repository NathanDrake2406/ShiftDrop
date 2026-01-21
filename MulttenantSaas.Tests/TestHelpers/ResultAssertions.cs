using FluentAssertions;
using FluentAssertions.Primitives;

namespace MulttenantSaas.Tests.TestHelpers;

/// <summary>
/// FluentAssertions extensions for Result&lt;T&gt;.
/// Usage: result.Should().BeSuccess() or result.Should().BeFailure().WithError("message")
/// </summary>
public static class ResultAssertionsExtensions
{
    public static ResultAssertions<T> Should<T>(this Result<T> result)
    {
        return new ResultAssertions<T>(result);
    }
}

public class ResultAssertions<T>
{
    private readonly Result<T> _result;

    public ResultAssertions(Result<T> result)
    {
        _result = result;
    }

    public AndWhichConstraint<ResultAssertions<T>, T> BeSuccess(string because = "", params object[] becauseArgs)
    {
        _result.IsSuccess.Should().BeTrue(
            $"Expected Result to be successful{(string.IsNullOrEmpty(because) ? "" : $" because {because}")}, but it failed with error: {_result.Error}");

        return new AndWhichConstraint<ResultAssertions<T>, T>(this, _result.Value!);
    }

    public FailureAssertions<T> BeFailure(string because = "", params object[] becauseArgs)
    {
        _result.IsFailure.Should().BeTrue(
            $"Expected Result to be a failure{(string.IsNullOrEmpty(because) ? "" : $" because {because}")}, but it was successful with value: {_result.Value}");

        return new FailureAssertions<T>(this, _result.Error!);
    }
}

public class FailureAssertions<T>
{
    private readonly ResultAssertions<T> _parent;
    private readonly string _error;

    public FailureAssertions(ResultAssertions<T> parent, string error)
    {
        _parent = parent;
        _error = error;
    }

    public AndConstraint<ResultAssertions<T>> WithError(string expectedError, string because = "", params object[] becauseArgs)
    {
        _error.Should().Contain(expectedError,
            $"Expected error to contain \"{expectedError}\"{(string.IsNullOrEmpty(because) ? "" : $" because {because}")}, but found \"{_error}\"");

        return new AndConstraint<ResultAssertions<T>>(_parent);
    }
}
